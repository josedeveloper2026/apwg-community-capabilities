import {
  accessLabel,
  availabilityLabel,
  capabilityTypeLabel,
  countryLabel,
  entityTypeLabel,
  threatLabel,
  verificationNarrative,
} from '../lib/format';
import { entityUrl, page, safeUrl } from '../lib/paths';
import { findCapability, loadRegistry } from '../lib/registry-store';
import { labelOf, DELIVERY_METHODS } from '../lib/vocabulary';
import type { Capability, InterfacePayload } from '../lib/types';
import { contactList, editLink, el, externalLink, publicationList, verificationCallout } from './view';

export function mountCapability(root: HTMLElement): void {
  const id = new URLSearchParams(window.location.search).get('id') ?? '';
  const found = findCapability(loadRegistry(), id);
  const wrap = el('div', { class: 'wrap' });
  root.append(wrap);
  if (!found) {
    wrap.append(el('div', { class: 'empty' },
      el('h1', { text: 'Capability not found' }),
      el('p', { text: 'That id is not in the published registry or in this browser.' }),
      el('p', {}, el('a', { class: 'button', text: 'Back to discover', attrs: { href: page('') } })),
    ));
    return;
  }

  const { entity, capability } = found;
  document.title = `${capability.name} · APWG Community Capabilities`;
  const head = el('header', { class: 'page-head' });
  head.append(
    el('p', { class: 'crumbs' },
      el('a', { text: 'Discover', attrs: { href: page('') } }),
      ' / ',
      el('a', { text: entity.name, attrs: { href: entityUrl(entity.entity_id) } }),
      ' / ',
      capability.name,
    ),
    el('p', { class: 'kicker', text: capabilityTypeLabel(capability.capability_type) }),
    el('h1', { text: capability.name }),
    el('p', { class: 'lede', text: capability.summary?.trim() || '' }),
  );

  const main = el('article', { class: 'detail-main prose' });
  main.append(verificationCallout(capability));
  main.append(el('h2', { text: 'What it is' }), el('p', { text: capability.description }));
  const tags = el('div', { class: 'tags' });
  for (const threat of capability.threat_categories ?? []) tags.append(el('span', { class: 'tag', text: threatLabel(threat) }));
  if (tags.childNodes.length) main.append(el('h2', { text: 'Threat categories' }), tags);
  if (capability.keywords?.length) main.append(el('h2', { text: 'Keywords' }), el('p', { text: capability.keywords.join(', ') }));

  const data = capability.data_characteristics;
  if (data && hasAny(data.data_types, data.formats, data.geographic_coverage, data.update_frequency, data.temporal_coverage)) {
    main.append(el('h2', { text: 'Data' }));
    main.append(facts([
      ['Data types', join(data.data_types)],
      ['Formats', join(data.formats)],
      ['Update frequency', data.update_frequency],
      ['Geographic coverage', join(data.geographic_coverage)],
      ['Temporal coverage', data.temporal_coverage],
    ]));
  }

  const interfaceInfo = capability.interface;
  if (interfaceInfo && (interfaceInfo.delivery_methods?.length || interfaceInfo.documentation_url || interfaceInfo.endpoint_url || interfaceInfo.input || interfaceInfo.output)) {
    main.append(el('h2', { text: 'Interface' }));
    main.append(facts([
      ['Delivery', (interfaceInfo.delivery_methods ?? []).map((method) => labelOf(DELIVERY_METHODS, method)).join(', ')],
      ['Documentation', linkOrEmpty(interfaceInfo.documentation_url, 'Documentation')],
      ['Endpoint', interfaceInfo.endpoint_url ? el('span', { class: 'mono', text: interfaceInfo.endpoint_url }) : ''],
    ]));
    const input = payload('Input', interfaceInfo.input);
    const output = payload('Output', interfaceInfo.output);
    if (input) main.append(input);
    if (output) main.append(output);
  }

  if (capability.related_publications?.length) {
    main.append(el('h2', { text: 'Publications and presentations' }), publicationList(capability.related_publications));
  }

  const refs = referenceLinks(capability);
  if (refs.length) main.append(el('h2', { text: 'References' }), el('div', { class: 'links' }, ...refs));

  const aside = el('aside', { class: 'aside' });
  aside.append(el('h2', { text: 'Access' }));
  aside.append(facts([
    ['Availability', availabilityLabel(capability.access?.availability)],
    ['Access level', accessLabel(capability.access?.access_level)],
    ['Authentication', capability.access?.authentication],
    ['License', capability.access?.license],
  ]));
  const request = externalLink(capability.access?.request_url, 'Request or visit');
  if (request) aside.append(request);
  if (capability.access?.usage_restrictions?.length) {
    aside.append(el('h2', { text: 'Restrictions noted from public sources' }));
    aside.append(el('ul', {}, ...capability.access.usage_restrictions.map((item) => el('li', { text: item }))));
  }
  if (capability.access?.privacy_notes) aside.append(el('p', { text: capability.access.privacy_notes }));
  aside.append(el('h2', { text: 'Provider' }));
  aside.append(el('p', {}, el('a', { text: entity.name, attrs: { href: entityUrl(entity.entity_id) } })));
  aside.append(el('p', { text: [entityTypeLabel(entity.entity_type), countryLabel(entity.country)].filter(Boolean).join(' · ') }));
  aside.append(el('h2', { text: 'Point of contact' }));
  const contacts = capability.points_of_contact?.length ? capability.points_of_contact : entity.points_of_contact;
  aside.append(contactList(contacts));
  aside.append(editLink(entity.entity_id));
  aside.append(el('p', { class: 'hint', text: verificationNarrative(capability) }));

  wrap.append(head, el('div', { class: 'detail' }, main, aside));
}

function facts(pairs: Array<[string, Node | string | null | undefined]>): HTMLDListElement {
  const list = el('dl');
  for (const [term, value] of pairs) {
    if (!value) continue;
    const row = el('div');
    row.append(el('dt', { text: term }), el('dd', {}, value));
    list.append(row);
  }
  return list;
}

function join(values: string[] | null | undefined): string {
  return (values ?? []).filter(Boolean).join(', ');
}

function hasAny(...values: unknown[]): boolean {
  return values.some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value));
}

function linkOrEmpty(url: string | null | undefined, label: string): HTMLAnchorElement | '' {
  return externalLink(url, label) ?? '';
}

function payload(title: string, value: InterfacePayload | null | undefined): HTMLElement | null {
  if (!value || (!value.description && !value.fields?.length)) return null;
  const block = el('section');
  block.append(el('h3', { text: title }));
  if (value.description) block.append(el('p', { text: value.description }));
  if (value.format) block.append(el('p', { class: 'mono', text: value.format }));
  if (value.fields?.length) {
    block.append(el('ul', {}, ...value.fields.map((field) => el('li', { text: `${field.name}${field.required ? ' (required)' : ''}${field.description ? `: ${field.description}` : ''}` }))));
  }
  return block;
}

function referenceLinks(capability: Capability): HTMLAnchorElement[] {
  const refs = capability.references;
  if (!refs) return [];
  return [
    externalLink(refs.project_url, 'Project'),
    externalLink(refs.repository_url, 'Repository'),
    externalLink(refs.dataset_url, 'Dataset'),
    externalLink(refs.presentation_url, 'Presentation'),
    externalLink(safeUrl(capability.interface?.documentation_url), 'Documentation'),
  ].filter((link): link is HTMLAnchorElement => Boolean(link));
}
