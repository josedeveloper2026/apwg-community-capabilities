import {
  accessLabel,
  availabilityLabel,
  capabilityTypeLabel,
  countryLabel,
  entityTypeLabel,
  familyLabel,
  familyOf,
  formatCheckedDate,
  relationshipLabel,
  summaryOf,
  threatLabel,
  verificationLabel,
  verificationNarrative,
} from '../lib/format';
import { capabilityUrl, editUrl, entityUrl, safeUrl } from '../lib/paths';
import { entityOrigin } from '../lib/registry-store';
import { DELIVERY_METHODS, labelOf } from '../lib/vocabulary';
import type { Capability, Contact, Entity, InterfacePayload, Publication } from '../lib/types';
import type { CapabilityHit } from '../lib/search';

type Child = Node | string | null | undefined | false;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { class?: string; text?: string; attrs?: Record<string, string | null | undefined> } = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.class) node.className = props.class;
  if (props.text) node.textContent = props.text;
  if (props.attrs) {
    for (const [key, value] of Object.entries(props.attrs)) {
      if (value != null && value !== '') node.setAttribute(key, value);
    }
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(child));
  }
  return node;
}

export function monogram(name: string): string {
  const skip = new Set(['the', 'a', 'an', 'of', 'for', 'and']);
  const words = name
    .replace(/[()]/g, ' ')
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => word && !skip.has(word.toLowerCase()));
  if (words.length === 0) return '•';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function externalLink(url: string | null | undefined, label: string): HTMLAnchorElement | null {
  const safe = safeUrl(url);
  if (!safe) return null;
  return el('a', { text: label, attrs: { href: safe, target: '_blank', rel: 'noreferrer' } });
}

export function pill(text: string, kind?: string): HTMLSpanElement {
  return el('span', { class: `pill${kind ? ` pill-${kind}` : ''}`, text });
}

export function capabilityCard(hit: CapabilityHit): HTMLElement {
  const { entity, capability } = hit;
  const family = familyOf(capability);
  const card = el('article', { class: `card family-${family}` });
  const title = el('h3');
  const titleLink = el('a', { text: capability.name, attrs: { href: capabilityUrl(capability.capability_id) } });
  title.append(titleLink);
  const provider = el('a', {
    class: 'provider',
    text: entity.name,
    attrs: { href: entityUrl(entity.entity_id) },
  });
  const pills = el('div', { class: 'pills' },
    pill(capabilityTypeLabel(capability.capability_type)),
    pill(accessLabel(capability.access?.access_level), capability.access?.access_level ?? 'unknown'),
    pill(verificationLabel(capability.verification?.status), capability.verification?.status ?? 'unverified'),
    pill(familyLabel(family)),
  );
  if (entityOrigin(entity.entity_id) !== 'published') pills.append(pill('In this browser', 'local'));
  const tags = el('div', { class: 'tags' });
  for (const threat of capability.threat_categories ?? []) tags.append(el('span', { class: 'tag', text: threatLabel(threat) }));
  card.append(
    title,
    provider,
    el('p', { class: 'summary', text: summaryOf(capability) }),
    el('div', { class: 'meta' }, pills, tags),
  );
  return card;
}

export function organizationCard(entity: Entity): HTMLElement {
  const card = el('article', { class: 'org' });
  const title = el('h2');
  title.append(el('a', { text: entity.name, attrs: { href: entityUrl(entity.entity_id) } }));
  const copy = el('div');
  copy.append(title);
  copy.append(el('p', { class: 'summary', text: entity.description }));
  const meta = el('div', { class: 'pills' }, pill(entityTypeLabel(entity.entity_type)));
  const country = countryLabel(entity.country);
  if (country) meta.append(pill(country));
  if (entityOrigin(entity.entity_id) !== 'published') meta.append(pill('In this browser', 'local'));
  copy.append(meta);
  const side = el('div', { class: 'org-side' });
  side.append(el('b', { text: String(entity.capabilities.length) }));
  side.append(el('span', { text: entity.capabilities.length === 1 ? 'capability' : 'capabilities' }));
  const site = externalLink(entity.website, 'Website');
  if (site) {
    site.className = 'inline-link';
    side.append(site);
  }
  card.append(el('div', { class: 'monogram', attrs: { 'aria-hidden': 'true' } }, monogram(entity.name)), copy, side);
  return card;
}

export function verificationCallout(capability: Capability): HTMLElement {
  const status = capability.verification?.status ?? 'unverified';
  const box = el('div', { class: `callout callout-${status === 'provider_confirmed' ? 'confirmed' : status}` });
  const title = el('strong', { text: verificationLabel(status) });
  box.append(title, ' ', verificationNarrative(capability));
  const checked = formatCheckedDate(capability.verification?.last_verified_at);
  if (checked && status === 'documented') box.append(` Public source checked ${checked}.`);
  if (capability.verification?.sharing_confirmed) box.append(' Sharing into this registry is marked confirmed.');
  else box.append(' Sharing into this registry is not confirmed.');
  const source = externalLink(capability.verification?.source_url, 'View source');
  if (source) {
    box.append(' ');
    box.append(source);
  }
  return box;
}

export function contactList(contacts: Contact[] | undefined): HTMLElement {
  const list = el('div', { class: 'links' });
  const visible = (contacts ?? []).filter((contact) => contact.name);
  if (visible.length === 0) {
    list.append(el('p', { text: 'No public point of contact was recorded.' }));
    return list;
  }
  for (const contact of visible) {
    const block = el('div');
    block.append(el('strong', { text: contact.name }));
    if (contact.title) block.append(el('div', { text: contact.title }));
    if (contact.email) {
      const mail = el('a', { text: contact.email, attrs: { href: `mailto:${contact.email}` } });
      block.append(mail);
    }
    const profile = externalLink(contact.profile_url, 'Profile');
    if (profile) block.append(profile);
    list.append(block);
  }
  return list;
}

export function publicationList(publications: Publication[] | undefined): HTMLElement {
  const list = el('div');
  for (const publication of publications ?? []) {
    const item = el('article', { class: 'pub' });
    const heading = el('h3');
    const link = externalLink(publication.url, publication.title);
    heading.append(link ?? publication.title);
    item.append(heading);
    const bits = [
      publication.authors?.length ? publication.authors.join(', ') : '',
      publication.year ? String(publication.year) : '',
      publication.venue ?? '',
      publication.relationship ? relationshipLabel(publication.relationship) : '',
    ].filter(Boolean);
    if (bits.length) item.append(el('p', { text: bits.join(' · ') }));
    if (publication.doi) item.append(el('p', { class: 'mono', text: publication.doi }));
    list.append(item);
  }
  return list;
}

export function definition(pairs: Array<[string, Child]>): HTMLDListElement {
  const list = el('dl');
  for (const [term, value] of pairs) {
    if (value === null || value === undefined || value === false || value === '') continue;
    const row = el('div');
    row.append(el('dt', { text: term }), el('dd', {}, value));
    list.append(row);
  }
  return list;
}

export function payloadBlock(title: string, payload: InterfacePayload | null | undefined): HTMLElement | null {
  if (!payload || (!payload.description && !(payload.fields && payload.fields.length))) return null;
  const block = el('section');
  block.append(el('h3', { text: title }));
  if (payload.description) block.append(el('p', { text: payload.description }));
  if (payload.format) block.append(el('p', { class: 'mono', text: payload.format }));
  if (payload.fields?.length) {
    const rows = payload.fields.map((field) => el('li', { text: `${field.name}${field.required ? ' (required)' : ''}${field.description ? ` — ${field.description}` : ''}` }));
    block.append(el('ul', {}, ...rows));
  }
  return block;
}

export function deliveryText(capability: Capability): string | null {
  const methods = capability.interface?.delivery_methods ?? [];
  if (!methods.length) return null;
  return methods.map((method) => labelOf(DELIVERY_METHODS, method)).join(', ');
}

export function notFound(title: string, message: string, href: string, label: string): HTMLElement {
  return el('div', { class: 'empty' },
    el('h1', { text: title }),
    el('p', { text: message }),
    el('p', {}, el('a', { class: 'button', text: label, attrs: { href } })),
  );
}

export function editLink(entityId: string): HTMLAnchorElement {
  return el('a', { class: 'button secondary', text: 'Request an update', attrs: { href: editUrl(entityId) } });
}
