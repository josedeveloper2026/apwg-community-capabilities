import { blankCapability, blankContact, blankEntity, blankPublication } from '../lib/blank';
import { prepareEntity } from '../lib/normalize';
import { entityUrl, page } from '../lib/paths';
import {
  downloadJson,
  findEntity,
  getPublishedRegistry,
  importRegistry,
  loadRegistry,
  resetLocalChanges,
  saveEntity,
} from '../lib/registry-store';
import { splitList, uniqueId } from '../lib/text';
import type { Capability, Contact, Entity, Publication } from '../lib/types';
import { coerceRegistry, validateRegistry } from '../lib/validate';
import {
  ACCESS_LEVELS,
  AVAILABILITY,
  CAPABILITY_TYPES,
  DELIVERY_METHODS,
  ENTITY_TYPES,
  RELATIONSHIPS,
  THREAT_CATEGORIES,
  VERIFICATION_STATUSES,
} from '../lib/vocabulary';
import { el } from './view';
import { mountLocalBanner } from './banner';

export function mountEditor(root: HTMLElement): void {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('entity');
  const current = loadRegistry();
  const existing = requested ? findEntity(current, requested) : undefined;
  const wrap = el('div', { class: 'wrap' });
  root.append(wrap);

  if (requested && !existing) {
    wrap.append(el('div', { class: 'empty' },
      el('h1', { text: 'Organization not found' }),
      el('p', { text: 'Open Add Capability to create a record, or return to the directory.' }),
      el('p', {}, el('a', { class: 'button', text: 'Add a capability', attrs: { href: page('add/') } })),
    ));
    return;
  }

  let draft: Entity = existing ? structuredClone(existing) : blankEntity();
  if (!draft.points_of_contact?.length) draft.points_of_contact = [blankContact()];
  if (!draft.capabilities.length) draft.capabilities = [blankCapability()];
  const editing = Boolean(existing);

  const errors = el('div', { class: 'errors', attrs: { hidden: 'hidden' } });
  const form = el('form', { attrs: { novalidate: 'novalidate' } }) as HTMLFormElement;
  const entityFields = el('div', { class: 'form-grid', attrs: { id: 'entity-fields' } });
  const contacts = el('div', { attrs: { id: 'contacts' } });
  const caps = el('div', { attrs: { id: 'caps' } });
  form.append(
    el('header', { class: 'page-head' },
      el('p', { class: 'kicker', text: editing ? 'Edit a local copy' : 'Contribute' }),
      el('h1', { text: editing ? `Edit ${draft.name}` : 'Add your capability' }),
      el('p', { class: 'lede', text: 'Records saved here stay in this browser and show up in search immediately. They are not public until the JSON is merged into the repository.' }),
    ),
    errors,
    el('h2', { text: 'Organization' }),
    entityFields,
    contacts,
    el('p', {}, el('button', { class: 'button ghost', text: 'Add a contact', attrs: { type: 'button', 'data-action': 'add-contact' } })),
    el('h2', { text: 'Capabilities' }),
    caps,
    el('div', { class: 'actions' },
      el('button', { class: 'button ghost', text: 'Add another capability', attrs: { type: 'button', 'data-action': 'add-capability' } }),
      el('button', { class: 'button', text: editing ? 'Save changes in this browser' : 'Save in this browser', attrs: { type: 'submit' } }),
    ),
  );

  const fileBox = filePanel();
  wrap.append(el('div', { class: 'editor-layout' }, form, fileBox));
  paintEntity();
  paintContacts();
  paintCaps();

  form.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]');
    if (!target) return;
    event.preventDefault();
    draft = scrape(form, draft);
    const action = target.dataset.action;
    const capIndex = numberAttr(target.closest<HTMLElement>('[data-cap-index]'), 'data-cap-index');
    const contactIndex = numberAttr(target.closest<HTMLElement>('[data-contact-index]'), 'data-contact-index');
    const pubIndex = numberAttr(target.closest<HTMLElement>('[data-pub-index]'), 'data-pub-index');
    if (action === 'add-contact') draft.points_of_contact = [...(draft.points_of_contact ?? []), blankContact()];
    if (action === 'remove-contact' && contactIndex != null) draft.points_of_contact?.splice(contactIndex, 1);
    if (action === 'add-capability') draft.capabilities.push(blankCapability());
    if (action === 'remove-capability' && capIndex != null) draft.capabilities.splice(capIndex, 1);
    if (action === 'add-publication' && capIndex != null) {
      draft.capabilities[capIndex].related_publications = [...(draft.capabilities[capIndex].related_publications ?? []), blankPublication()];
    }
    if (action === 'remove-publication' && capIndex != null && pubIndex != null) {
      draft.capabilities[capIndex].related_publications?.splice(pubIndex, 1);
    }
    if (!draft.points_of_contact?.length) draft.points_of_contact = [blankContact()];
    if (!draft.capabilities.length) draft.capabilities = [blankCapability()];
    paintContacts();
    paintCaps();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    draft = scrape(form, draft);
    const prepared = prepareEntity(draft);
    assignIds(prepared);
    const result = validateRegistry({ schema_version: '0.1.0', entities: [prepared] });
    const problems = result.issues.filter((issue) => issue.severity === 'error');
    if (problems.length) {
      errors.hidden = false;
      errors.replaceChildren(el('strong', { text: 'This record needs a few fixes.' }), el('ul', {}, ...problems.map((issue) => el('li', { text: `${issue.path}: ${issue.message}` }))));
      errors.scrollIntoView({ block: 'center' });
      draft = prepared;
      return;
    }
    saveEntity(prepared);
    refreshBanner();
    window.location.href = `${entityUrl(prepared.entity_id)}&saved=1`;
  });

  function paintEntity(): void {
    entityFields.replaceChildren(
      labeled('Name', control('text', 'entity-name', draft.name), true),
      labeled('Type', select('entity-type', ENTITY_TYPES, draft.entity_type)),
      labeled('Country code', control('text', 'country', draft.country), false, 'ISO code such as US, VN, or GB. Leave blank if unknown.'),
      labeled('Website', control('url', 'website', draft.website)),
      labeled('Parent institution', control('text', 'parent', draft.parent_institution)),
      labeled('Department', control('text', 'department', draft.department)),
      labeled('Description', area('description', draft.description), true),
    );
    if (draft.entity_id) entityFields.append(el('p', { class: 'hint span-2', text: `ID ${draft.entity_id}. IDs stay stable so links keep working.` }));
  }

  function paintContacts(): void {
    contacts.replaceChildren();
    (draft.points_of_contact ?? []).forEach((contact, index) => {
      const block = el('div', { class: 'form-grid cap-block', attrs: { 'data-contact-index': String(index) } });
      block.append(
        labeled('Contact name', control('text', 'name', contact.name)),
        labeled('Title', control('text', 'title', contact.title)),
        labeled('Email', control('email', 'email', contact.email), false, 'Only an address the organization has published.'),
        labeled('Profile URL', control('url', 'profile', contact.profile_url)),
      );
      if ((draft.points_of_contact ?? []).length > 1) {
        block.append(el('button', { class: 'button ghost', text: 'Remove contact', attrs: { type: 'button', 'data-action': 'remove-contact' } }));
      }
      contacts.append(block);
    });
  }

  function paintCaps(): void {
    caps.replaceChildren();
    draft.capabilities.forEach((capability, index) => caps.append(capabilityBlock(capability, index, draft.capabilities.length > 1, editing)));
  }
}

function capabilityBlock(capability: Capability, index: number, removable: boolean, editing: boolean): HTMLElement {
  const block = el('fieldset', { class: 'cap-block', attrs: { 'data-cap-index': String(index) } });
  const head = el('div', { class: 'cap-head' });
  head.append(el('legend', { text: capability.name || `Capability ${index + 1}` }));
  if (removable) head.append(el('button', { class: 'button ghost', text: 'Remove', attrs: { type: 'button', 'data-action': 'remove-capability' } }));
  const grid = el('div', { class: 'form-grid' });
  grid.append(
    labeled('Name', control('text', 'name', capability.name), true),
    labeled('Type', select('type', CAPABILITY_TYPES, capability.capability_type)),
    labeled('Summary', control('text', 'summary', capability.summary)),
    labeled('Description', area('description', capability.description), true),
    checks('Threat categories', 'threat', THREAT_CATEGORIES, capability.threat_categories ?? []),
    labeled('Keywords', control('text', 'keywords', (capability.keywords ?? []).join(', ')), true, 'Comma-separated.'),
  );
  const advanced = el('details', { class: 'advanced span-2' });
  if (editing) advanced.open = true;
  const advancedGrid = el('div', { class: 'form-grid' });
  advanced.append(el('summary', { text: 'Data, access, and provenance' }), advancedGrid);
  advancedGrid.append(
    labeled('Data types', control('text', 'data_types', (capability.data_characteristics?.data_types ?? []).join(', ')), false, 'Comma-separated.'),
    labeled('Formats', control('text', 'formats', (capability.data_characteristics?.formats ?? []).join(', '))),
    labeled('Update frequency', control('text', 'update_frequency', capability.data_characteristics?.update_frequency)),
    labeled('Geographic coverage', control('text', 'coverage', (capability.data_characteristics?.geographic_coverage ?? []).join(', '))),
    labeled('Temporal coverage', control('text', 'temporal', capability.data_characteristics?.temporal_coverage)),
    checks('Delivery', 'delivery', DELIVERY_METHODS, capability.interface?.delivery_methods ?? []),
    labeled('Project URL', control('url', 'project_url', capability.references?.project_url)),
    labeled('Documentation URL', control('url', 'documentation_url', capability.interface?.documentation_url)),
    labeled('Access level', select('access_level', ACCESS_LEVELS, capability.access?.access_level ?? 'unknown')),
    labeled('Availability', select('availability', AVAILABILITY, capability.access?.availability ?? 'unverified')),
    labeled('Authentication', control('text', 'authentication', capability.access?.authentication)),
    labeled('License', control('text', 'license', capability.access?.license)),
    labeled('Request URL', control('url', 'request_url', capability.access?.request_url)),
    labeled('Usage restrictions', control('text', 'restrictions', (capability.access?.usage_restrictions ?? []).join(', ')), true, 'Comma-separated.'),
    labeled('Verification', select('verification', VERIFICATION_STATUSES, capability.verification?.status ?? 'unverified'), false, 'Use provider confirmed only after the provider has reviewed this record.'),
    labeled('Source URL', control('url', 'source_url', capability.verification?.source_url)),
    flag('Described on the provider’s own site', 'claimed', capability.verification?.claimed_by_provider ?? false),
    flag('Sharing into this registry is confirmed', 'sharing', capability.verification?.sharing_confirmed ?? false),
  );
  grid.append(advanced);
  block.append(head, grid, publications(capability.related_publications ?? []));
  if (capability.capability_id) block.append(el('p', { class: 'hint', text: `ID ${capability.capability_id}` }));
  return block;
}

function publications(items: Publication[]): HTMLElement {
  const box = el('div');
  box.append(el('h3', { text: 'Publications' }));
  items.forEach((publication, index) => {
    const row = el('div', { class: 'form-grid cap-block', attrs: { 'data-pub-index': String(index) } });
    row.append(
      labeled('Title', control('text', 'title', publication.title), true),
      labeled('Authors', control('text', 'authors', (publication.authors ?? []).join(', ')), true, 'Comma-separated.'),
      labeled('Year', control('number', 'year', publication.year ? String(publication.year) : '')),
      labeled('Venue', control('text', 'venue', publication.venue)),
      labeled('URL', control('url', 'url', publication.url)),
      labeled('DOI', control('text', 'doi', publication.doi)),
      labeled('Relationship', select('relationship', RELATIONSHIPS, publication.relationship ?? 'describes_capability')),
      el('button', { class: 'button ghost', text: 'Remove publication', attrs: { type: 'button', 'data-action': 'remove-publication' } }),
    );
    box.append(row);
  });
  box.append(el('button', { class: 'button ghost', text: 'Add a publication', attrs: { type: 'button', 'data-action': 'add-publication' } }));
  return box;
}

function filePanel(): HTMLElement {
  const box = el('aside', { class: 'file-box', attrs: { id: 'registry-file' } });
  const message = el('p', { class: 'hint', text: 'Import merges records into this browser. Matching published records are left unchanged.' });
  const replace = el('label', { class: 'hint' });
  const replaceInput = el('input', { attrs: { type: 'checkbox' } }) as HTMLInputElement;
  replace.append(replaceInput, ' Replace local changes with this file');
  const file = el('input', { attrs: { type: 'file', accept: 'application/json,.json' } }) as HTMLInputElement;
  box.append(
    el('h2', { text: 'Registry file' }),
    el('p', { text: 'To publish a record for everyone, export JSON and open a pull request that updates src/data/registry.json.' }),
    el('button', { class: 'button', text: 'Download registry in this browser', attrs: { type: 'button' } }),
    el('button', { class: 'button secondary', text: 'Download published registry', attrs: { type: 'button' } }),
    file,
    replace,
    message,
    el('button', { class: 'button ghost', text: 'Clear local changes', attrs: { type: 'button' } }),
  );
  const [downloadLocal, downloadPublished, clear] = [...box.querySelectorAll('button')];
  downloadLocal.addEventListener('click', () => downloadJson('apwg-community-capabilities.json', loadRegistry()));
  downloadPublished.addEventListener('click', () => downloadJson('apwg-community-capabilities-published.json', getPublishedRegistry()));
  clear.addEventListener('click', () => {
    if (!window.confirm('Remove every organization and edit stored only in this browser?')) return;
    resetLocalChanges();
    refreshBanner();
    window.location.href = page('add/');
  });
  file.addEventListener('change', async () => {
    const chosen = file.files?.[0];
    if (!chosen) return;
    try {
      const parsed: unknown = JSON.parse(await chosen.text());
      const registry = coerceRegistry(parsed);
      if (!registry) {
        message.textContent = 'That file is not a registry, a list of organizations, or one organization.';
        return;
      }
      const result = validateRegistry(registry);
      const problems = result.issues.filter((issue) => issue.severity === 'error');
      if (problems.length) {
        message.textContent = problems.slice(0, 4).map((issue) => issue.message).join(' ');
        return;
      }
      const count = importRegistry(registry, replaceInput.checked ? 'replace-local' : 'merge');
      refreshBanner();
      message.textContent = `Imported ${count} ${count === 1 ? 'organization' : 'organizations'} into this browser.`;
      window.setTimeout(() => { window.location.href = page(''); }, 600);
    } catch {
      message.textContent = 'That file is not valid JSON.';
    }
  });
  return box;
}

function scrape(form: HTMLFormElement, draft: Entity): Entity {
  const entityFields = form.querySelector<HTMLElement>('#entity-fields')!;
  const next = structuredClone(draft);
  next.name = field(entityFields, 'entity-name');
  next.entity_type = field(entityFields, 'entity-type');
  next.country = field(entityFields, 'country');
  next.website = field(entityFields, 'website');
  next.parent_institution = field(entityFields, 'parent');
  next.department = field(entityFields, 'department');
  next.description = field(entityFields, 'description');
  next.points_of_contact = [...form.querySelectorAll<HTMLElement>('[data-contact-index]')].map((node, index) => ({
    ...(draft.points_of_contact?.[index] ?? blankContact()),
    name: field(node, 'name'),
    title: field(node, 'title'),
    email: field(node, 'email'),
    profile_url: field(node, 'profile'),
    role: draft.points_of_contact?.[index]?.role || 'primary',
  }));
  next.capabilities = [...form.querySelectorAll<HTMLElement>('[data-cap-index]')].map((node, index) => {
    const current = draft.capabilities[index] ?? blankCapability();
    const yearOf = (publication: HTMLElement) => {
      const raw = field(publication, 'year').trim();
      if (!raw) return null;
      const year = Number(raw);
      return Number.isFinite(year) ? year : null;
    };
    return {
      ...current,
      name: field(node, 'name'),
      capability_type: field(node, 'type'),
      summary: field(node, 'summary'),
      description: field(node, 'description'),
      threat_categories: values(node, 'threat'),
      keywords: splitList(field(node, 'keywords')),
      data_characteristics: {
        ...current.data_characteristics,
        data_types: splitList(field(node, 'data_types')),
        formats: splitList(field(node, 'formats')),
        update_frequency: field(node, 'update_frequency'),
        geographic_coverage: splitList(field(node, 'coverage')),
        temporal_coverage: field(node, 'temporal'),
      },
      interface: {
        ...current.interface,
        delivery_methods: values(node, 'delivery'),
        documentation_url: field(node, 'documentation_url'),
      },
      access: {
        ...current.access,
        access_level: field(node, 'access_level'),
        availability: field(node, 'availability'),
        authentication: field(node, 'authentication'),
        license: field(node, 'license'),
        request_url: field(node, 'request_url'),
        usage_restrictions: splitList(field(node, 'restrictions')),
      },
      references: {
        ...current.references,
        project_url: field(node, 'project_url'),
      },
      verification: {
        ...current.verification,
        status: field(node, 'verification'),
        source_url: field(node, 'source_url'),
        claimed_by_provider: values(node, 'claimed').includes('yes'),
        sharing_confirmed: values(node, 'sharing').includes('yes'),
      },
      related_publications: [...node.querySelectorAll<HTMLElement>('[data-pub-index]')].map((publication, pubIndex) => ({
        ...(current.related_publications?.[pubIndex] ?? blankPublication()),
        title: field(publication, 'title'),
        authors: splitList(field(publication, 'authors')),
        year: yearOf(publication),
        venue: field(publication, 'venue'),
        url: field(publication, 'url'),
        doi: field(publication, 'doi'),
        relationship: field(publication, 'relationship'),
      })),
    };
  });
  return next;
}

function assignIds(entity: Entity): void {
  const registry = loadRegistry();
  const entityIds = new Set(registry.entities.map((item) => item.entity_id));
  entityIds.delete(entity.entity_id);
  if (!entity.entity_id) entity.entity_id = uniqueId('org', entity.name || 'organization', entityIds);
  const capabilityIds = new Set<string>();
  for (const item of registry.entities) {
    if (item.entity_id === entity.entity_id) continue;
    for (const capability of item.capabilities) capabilityIds.add(capability.capability_id);
  }
  for (const capability of entity.capabilities) {
    if (!capability.capability_id) capability.capability_id = uniqueId('cap', capability.name || 'capability', capabilityIds);
    capabilityIds.add(capability.capability_id);
  }
}

function field(root: ParentNode, name: string): string {
  const node = root.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[data-field="${name}"]`);
  return node?.value ?? '';
}

function values(root: ParentNode, name: string): string[] {
  return [...root.querySelectorAll<HTMLInputElement>(`[data-field="${name}"]:checked`)].map((node) => node.value);
}

function control(type: string, name: string, value: string | null | undefined): HTMLInputElement {
  const input = document.createElement('input');
  input.type = type;
  input.dataset.field = name;
  input.value = value ?? '';
  return input;
}

function area(name: string, value: string | null | undefined): HTMLTextAreaElement {
  const input = document.createElement('textarea');
  input.dataset.field = name;
  input.value = value ?? '';
  return input;
}

function select(name: string, options: Array<{ value: string; label: string }>, current: string | null | undefined): HTMLSelectElement {
  const input = document.createElement('select');
  input.dataset.field = name;
  for (const option of options) input.add(new Option(option.label, option.value, false, option.value === (current ?? '')));
  if (current && ![...input.options].some((option) => option.value === current)) input.add(new Option(current, current, false, true));
  return input;
}

function labeled(text: string, input: HTMLElement, wide = false, hint?: string): HTMLLabelElement {
  const label = el('label', { class: wide ? 'span-2' : undefined });
  label.append(text, input);
  if (hint) label.append(el('span', { class: 'hint', text: hint }));
  return label;
}

function checks(title: string, name: string, options: Array<{ value: string; label: string }>, selected: string[]): HTMLElement {
  const group = el('fieldset', { class: 'span-2' });
  group.append(el('legend', { text: title }));
  const grid = el('div', { class: 'check-grid' });
  for (const option of options) {
    const label = el('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.field = name;
    input.value = option.value;
    input.checked = selected.includes(option.value);
    label.append(input, option.label);
    grid.append(label);
  }
  group.append(grid);
  return group;
}

function flag(text: string, name: string, checked: boolean): HTMLLabelElement {
  const label = el('label', { class: 'span-2' });
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.dataset.field = name;
  input.value = 'yes';
  input.checked = checked;
  label.append(input, ` ${text}`);
  return label;
}

function numberAttr(node: HTMLElement | null, name: string): number | null {
  if (!node) return null;
  const value = node.getAttribute(name);
  return value == null ? null : Number(value);
}

function refreshBanner(): void {
  const banner = document.getElementById('local-banner');
  if (banner) mountLocalBanner(banner);
}
