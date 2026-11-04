import { countryLabel, entityTypeLabel } from '../lib/format';
import { page } from '../lib/paths';
import { loadRegistry } from '../lib/registry-store';
import { fold } from '../lib/text';
import { ENTITY_TYPES } from '../lib/vocabulary';
import type { Entity } from '../lib/types';
import { el, organizationCard } from './view';

export function mountDirectory(root: HTMLElement): void {
  const registry = loadRegistry();
  const params = new URLSearchParams(window.location.search);
  let text = params.get('q') ?? '';
  let types = (params.get('type') ?? '').split(',').filter(Boolean);

  const head = el('header', { class: 'page-head' },
    el('p', { class: 'kicker', text: 'Organizations' }),
    el('h1', { text: 'Who is advertising a capability' }),
    el('p', { class: 'lede', text: 'Universities, nonprofits, companies, and community projects with at least one record in this registry.' }),
  );
  const input = el('input', { attrs: { type: 'search', value: text, 'aria-label': 'Search organizations', placeholder: 'Search by name, description, or capability' } }) as HTMLInputElement;
  const chips = el('div', { class: 'filter-row' });
  const list = el('div', { class: 'directory' });
  root.append(el('div', { class: 'wrap' }, head, el('div', { class: 'toolbar' }, el('div', { class: 'search' }, input), chips), list));

  input.addEventListener('input', () => {
    text = input.value;
    sync();
    paint();
  });
  paint();

  function paint(): void {
    chips.replaceChildren();
    for (const type of ENTITY_TYPES) {
      const button = el('button', {
        class: 'chip',
        text: type.label,
        attrs: { type: 'button', 'aria-pressed': types.includes(type.value) ? 'true' : 'false' },
      });
      button.addEventListener('click', () => {
        types = types.includes(type.value) ? types.filter((item) => item !== type.value) : [...types, type.value];
        sync();
        paint();
      });
      chips.append(button);
    }
    const matched = registry.entities
      .filter((entity) => entityMatches(entity, text, types))
      .sort((a, b) => a.name.localeCompare(b.name, 'en'));
    list.replaceChildren();
    if (matched.length === 0) {
      list.append(el('div', { class: 'empty' },
        el('p', { text: 'No organization matches.' }),
        el('p', {}, el('a', { text: 'Add one', attrs: { href: page('add/') } })),
      ));
      return;
    }
    for (const entity of matched) list.append(organizationCard(entity));
  }

  function sync(): void {
    const next = new URLSearchParams();
    if (text.trim()) next.set('q', text);
    if (types.length) next.set('type', types.join(','));
    window.history.replaceState(null, '', `${window.location.pathname}${next.size ? `?${next.toString()}` : ''}`);
  }
}

function entityMatches(entity: Entity, text: string, types: string[]): boolean {
  if (types.length && !types.includes(entity.entity_type)) return false;
  const tokens = fold(text).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = fold([
    entity.name,
    entity.description,
    entity.website,
    countryLabel(entity.country),
    entityTypeLabel(entity.entity_type),
    ...entity.capabilities.flatMap((capability) => [capability.name, capability.summary, capability.description]),
  ].filter(Boolean).join(' '));
  return tokens.every((token) => haystack.includes(token));
}
