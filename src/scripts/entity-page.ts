import { accessLabel, capabilityTypeLabel, countryLabel, entityTypeLabel, summaryOf, threatLabel } from '../lib/format';
import { capabilityUrl, page } from '../lib/paths';
import { downloadJson, entityOrigin, findEntity, loadRegistry, revertEntity } from '../lib/registry-store';
import { editUrl } from '../lib/paths';
import { el, externalLink, monogram, pill, verificationCallout } from './view';

export function mountEntity(root: HTMLElement): void {
  const id = new URLSearchParams(window.location.search).get('id') ?? '';
  const registry = loadRegistry();
  const entity = findEntity(registry, id);
  const wrap = el('div', { class: 'wrap' });
  root.append(wrap);
  if (!entity) {
    wrap.append(el('div', { class: 'empty' },
      el('h1', { text: 'Organization not found' }),
      el('p', { text: 'That id is not in the published registry or in this browser.' }),
      el('p', {}, el('a', { class: 'button', text: 'Back to organizations', attrs: { href: page('organizations/') } })),
    ));
    return;
  }

  document.title = `${entity.name} · APWG Community Capabilities`;
  const saved = new URLSearchParams(window.location.search).get('saved') === '1';
  const origin = entityOrigin(entity.entity_id);
  const head = el('header', { class: 'page-head' });
  head.append(el('p', { class: 'crumbs' }, el('a', { text: 'Organizations', attrs: { href: page('organizations/') } }), ' / ', entity.name));
  const titleRow = el('div', { class: 'cap-head' });
  const titleBlock = el('div');
  titleBlock.append(el('h1', { text: entity.name }));
  const pills = el('div', { class: 'pills' }, pill(entityTypeLabel(entity.entity_type)));
  const country = countryLabel(entity.country);
  if (country) pills.append(pill(country));
  if (origin !== 'published') pills.append(pill(origin === 'local' ? 'Added in this browser' : 'Edited in this browser', 'local'));
  titleBlock.append(pills);
  titleRow.append(el('div', { class: 'monogram', attrs: { 'aria-hidden': 'true' } }, monogram(entity.name)), titleBlock);
  head.append(titleRow);
  if (saved) head.append(el('p', { class: 'callout callout-confirmed', text: 'Saved in this browser. It is included in search on this computer. Export JSON from Add Capability if you want to propose it for the shared registry.' }));

  const main = el('article', { class: 'detail-main prose' });
  main.append(el('p', { text: entity.description }));
  if (entity.parent_institution || entity.department) {
    main.append(el('p', { text: [entity.parent_institution, entity.department].filter(Boolean).join(' · ') }));
  }
  main.append(el('h2', { text: 'Capabilities' }));
  const cards = el('div', { class: 'cards' });
  for (const capability of entity.capabilities) {
    const card = el('article', { class: 'card' });
    const heading = el('h3');
    heading.append(el('a', { text: capability.name, attrs: { href: capabilityUrl(capability.capability_id) } }));
    card.append(
      heading,
      el('p', { class: 'summary', text: summaryOf(capability) }),
      el('div', { class: 'pills' },
        pill(capabilityTypeLabel(capability.capability_type)),
        pill(accessLabel(capability.access?.access_level), capability.access?.access_level ?? 'unknown'),
        pill(verificationLabelSafe(capability.verification?.status), capability.verification?.status ?? 'unverified'),
      ),
      el('div', { class: 'tags' }, ...(capability.threat_categories ?? []).map((threat) => el('span', { class: 'tag', text: threatLabel(threat) }))),
    );
    cards.append(card);
  }
  if (entity.capabilities.length === 0) cards.append(el('p', { text: 'No capabilities have been added yet.' }));
  main.append(cards);

  const aside = el('aside', { class: 'aside' });
  aside.append(el('h2', { text: 'Identity' }));
  const facts = el('dl');
  addFact(facts, 'Type', entityTypeLabel(entity.entity_type));
  if (country) addFact(facts, 'Country', country);
  if (entity.entity_id) addFact(facts, 'ID', entity.entity_id, true);
  aside.append(facts);
  const site = externalLink(entity.website, 'Organization website');
  if (site) aside.append(site);
  aside.append(el('h2', { text: 'Contact' }));
  aside.append(contacts(entity.points_of_contact));
  aside.append(el('a', { class: 'button', text: 'Edit in this browser', attrs: { href: editUrl(entity.entity_id) } }));
  const download = el('button', { class: 'button secondary', text: 'Download this record', attrs: { type: 'button' } });
  download.addEventListener('click', () => downloadJson(`${entity.entity_id}.json`, entity));
  aside.append(download);
  if (origin !== 'published') {
    const revert = el('button', { class: 'button ghost', text: origin === 'local' ? 'Remove local record' : 'Revert to published record', attrs: { type: 'button' } });
    revert.addEventListener('click', () => {
      const ok = window.confirm(origin === 'local' ? 'Remove this organization from this browser?' : 'Discard local edits and restore the published record?');
      if (!ok) return;
      revertEntity(entity.entity_id);
      window.location.href = origin === 'local' ? page('organizations/') : window.location.pathname + `?id=${encodeURIComponent(entity.entity_id)}`;
    });
    aside.append(revert);
  }

  wrap.append(head, el('div', { class: 'detail' }, main, aside));
}

function verificationLabelSafe(status: string | null | undefined): string {
  if (status === 'provider_confirmed') return 'Provider confirmed';
  if (status === 'documented') return 'Documented';
  return 'Unverified';
}

function addFact(list: HTMLDListElement, term: string, value: string, mono = false): void {
  const row = el('div');
  row.append(el('dt', { text: term }), el('dd', { class: mono ? 'mono' : undefined, text: value }));
  list.append(row);
}

function contacts(items: { name: string; title?: string | null; email?: string | null; profile_url?: string | null }[] | undefined): HTMLElement {
  const box = el('div', { class: 'links' });
  const visible = (items ?? []).filter((item) => item.name);
  if (visible.length === 0) {
    box.append(el('p', { text: 'No public point of contact was recorded.' }));
    return box;
  }
  for (const contact of visible) {
    const block = el('div');
    block.append(el('strong', { text: contact.name }));
    if (contact.title) block.append(el('div', { text: contact.title }));
    if (contact.email) block.append(el('a', { text: contact.email, attrs: { href: `mailto:${contact.email}` } }));
    const profile = externalLink(contact.profile_url, 'Profile');
    if (profile) block.append(profile);
    box.append(block);
  }
  return box;
}
