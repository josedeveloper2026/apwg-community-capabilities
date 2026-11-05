import {
  accessLabel,
  capabilityTypeLabel,
  familyOf,
  threatLabel,
  verificationLabel,
} from '../lib/format';
import { capabilityUrl, entityUrl, page } from '../lib/paths';
import { entityOrigin, loadRegistry } from '../lib/registry-store';
import { isFiltered, searchCapabilities, type CapabilityHit, type SearchQuery } from '../lib/search';
import { fold } from '../lib/text';
import type { Capability, Registry } from '../lib/types';
import { ACCESS_LEVELS, CAPABILITY_TYPES, ENTITY_TYPES, THREAT_CATEGORIES } from '../lib/vocabulary';
import { el, pill } from './view';

export function mountDiscover(root: HTMLElement): void {
  const registry = loadRegistry();
  let query = readQuery();

  const hero = el('header', { class: 'hero' },
    el('p', { class: 'kicker', text: 'APWG eCrime 2026 prototype' }),
    el('h1', { text: 'Discover cybersecurity research community capabilities.' }),
    el('p', { class: 'lede', text: 'A searchable registry of threat intelligence, datasets, detection systems, and research services from organizations connected to the APWG community.' }),
    el('div', { class: 'actions' },
      el('a', { class: 'button', text: 'Search the registry', attrs: { href: '#search' } }),
      el('a', { class: 'button secondary', text: 'Add/Edit Capability', attrs: { href: page('add/') } }),
    ),
  );
  const stats = el('section', { class: 'stats', attrs: { 'aria-label': 'Registry summary' } });
  const note = el('p', { class: 'note', text: 'Documented means a public source describes the capability. Unverified means an operational offering has not been confirmed. Provider confirmed is reserved for records the provider has reviewed. None of the published seed records use that label.' });
  const toolbar = el('section', { class: 'toolbar', attrs: { id: 'search' } });
  const search = el('div', { class: 'search' });
  const input = el('input', { attrs: { id: 'q', type: 'search', placeholder: 'Filter by organization or capability', value: query.q, 'aria-label': 'Filter by organization or capability' } }) as HTMLInputElement;
  search.append(el('span', { attrs: { 'aria-hidden': 'true' }, text: '⌕' }), input);
  const filters = el('div', { class: 'filters' });
  toolbar.append(search, filters);
  const count = el('p', { class: 'count', attrs: { 'aria-live': 'polite' } });
  const results = el('div', { attrs: { id: 'results' } });

  root.append(el('div', { class: 'wrap' }, hero, stats, note, toolbar, count, results));
  renderStats(stats, registry);
  renderFilters();
  renderResults();

  input.addEventListener('input', () => {
    query = { ...query, q: input.value };
    writeQuery(query);
    renderFilters();
    renderResults();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === '/' && document.activeElement !== input && !(document.activeElement instanceof HTMLInputElement) && !(document.activeElement instanceof HTMLTextAreaElement)) {
      event.preventDefault();
      input.focus();
    }
  });

  function renderFilters(): void {
    filters.replaceChildren(
      filterSelect('Type', 'All types', CAPABILITY_TYPES, query.capabilityTypes, (value) => {
        query = { ...query, capabilityTypes: value ? [value] : [] };
        refresh();
      }, (value) => visibleHits({ capabilityTypes: [value] }).length),
      filterSelect('Threat', 'All threats', THREAT_CATEGORIES, query.threatCategories, (value) => {
        query = { ...query, threatCategories: value ? [value] : [] };
        refresh();
      }, (value) => visibleHits({ threatCategories: [value] }).length),
      filterSelect('Organization', 'All organizations', ENTITY_TYPES, query.entityTypes, (value) => {
        query = { ...query, entityTypes: value ? [value] : [] };
        refresh();
      }, (value) => visibleHits({ entityTypes: [value] }).length),
      filterSelect('Access', 'All access levels', ACCESS_LEVELS, query.accessLevels, (value) => {
        query = { ...query, accessLevels: value ? [value] : [] };
        refresh();
      }, (value) => visibleHits({ accessLevels: [value] }).length),
    );
    if (isFiltered(query)) {
      const clear = el('button', { class: 'button ghost', text: 'Clear filters', attrs: { type: 'button' } });
      clear.addEventListener('click', () => {
        query = { q: '', capabilityTypes: [], threatCategories: [], entityTypes: [], accessLevels: [] };
        input.value = '';
        refresh();
      });
      filters.append(clear);
    }
  }

  function refresh(): void {
    writeQuery(query);
    renderFilters();
    renderResults();
  }

  function visibleHits(overrides: Partial<SearchQuery> = {}): CapabilityHit[] {
    const next: SearchQuery = { ...query, ...overrides, q: '' };
    return searchCapabilities(registry, next)
      .filter((hit) => matchesOrgOrCapability(hit, query.q))
      .sort((a, b) => {
        const byOrg = a.entity.name.localeCompare(b.entity.name, 'en');
        if (byOrg !== 0) return byOrg;
        return a.capability.name.localeCompare(b.capability.name, 'en');
      });
  }

  function renderResults(): void {
    const hits = visibleHits();
    const organizations = new Set(hits.map((hit) => hit.entity.entity_id)).size;
    count.textContent = hits.length === 0
      ? 'No capabilities match.'
      : `${hits.length} ${hits.length === 1 ? 'capability' : 'capabilities'} from ${organizations} ${organizations === 1 ? 'organization' : 'organizations'}`;
    results.replaceChildren();
    if (hits.length === 0) {
      results.append(el('div', { class: 'empty' },
        el('p', { text: 'Nothing in the published registry or this browser matches. Clear a filter, or add a record.' }),
        el('p', {}, el('a', { class: 'button', text: 'Add/Edit Capability', attrs: { href: page('add/') } })),
      ));
      return;
    }
    results.append(registryTable(hits));
  }
}

function matchesOrgOrCapability(hit: CapabilityHit, q: string): boolean {
  const tokens = fold(q).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const org = fold(hit.entity.name);
  const capability = fold(hit.capability.name);
  return tokens.every((token) => org.includes(token) || capability.includes(token));
}

function registryTable(hits: CapabilityHit[]): HTMLElement {
  const table = el('table', { class: 'registry-table' });
  const head = el('tr');
  for (const label of ['Organization', 'Capability', 'Type', 'Access', 'Status', 'Threats']) {
    head.append(el('th', { text: label, attrs: { scope: 'col' } }));
  }
  const body = el('tbody');
  for (const hit of hits) {
    const { entity, capability } = hit;
    const family = familyOf(capability);
    const threats = (capability.threat_categories ?? []).map((threat) => threatLabel(threat));
    const organization = el('td', { class: 'org-cell' });
    organization.append(el('a', { text: entity.name, attrs: { href: entityUrl(entity.entity_id) } }));
    if (entityOrigin(entity.entity_id) !== 'published') organization.append(pill('In this browser', 'local'));
    const name = el('td');
    name.append(el('a', { text: capability.name, attrs: { href: capabilityUrl(capability.capability_id) } }));
    body.append(el('tr', { class: `family-${family}` },
      organization,
      name,
      el('td', {}, el('span', { class: `kind kind-${family}`, text: capabilityTypeLabel(capability.capability_type) })),
      el('td', { class: 'nowrap', text: accessLabel(capability.access?.access_level) }),
      el('td', { class: 'nowrap' }, pill(verificationLabel(capability.verification?.status), capability.verification?.status ?? 'unverified')),
      el('td', { text: threats.length ? threats.join(', ') : '—' }),
    ));
  }
  table.append(el('thead', {}, head), body);
  return el('div', { class: 'table-wrap' }, table);
}

function renderStats(root: HTMLElement, registry: Registry): void {
  const capabilities = registry.entities.flatMap((entity) => entity.capabilities);
  const items: Array<[number, string]> = [
    [registry.entities.length, 'Organizations'],
    [capabilities.length, 'Capabilities'],
    [countType(capabilities, 'dataset'), 'Datasets'],
    [countType(capabilities, 'intelligence_feed'), 'Feeds'],
    [capabilities.filter((item) => ['detection_service', 'collection_service', 'platform'].includes(item.capability_type)).length, 'Services'],
  ];
  root.replaceChildren(...items.map(([value, label]) => el('div', { class: 'stat' }, el('b', { text: String(value) }), el('span', { text: label }))));
}

function countType(capabilities: Capability[], type: string): number {
  return capabilities.filter((item) => item.capability_type === type).length;
}

function filterSelect(
  label: string,
  allLabel: string,
  options: Array<{ value: string; label: string }>,
  selected: string[],
  onChange: (value: string) => void,
  count: (value: string) => number,
): HTMLElement {
  const select = el('select', { attrs: { 'aria-label': label } }) as HTMLSelectElement;
  const all = el('option', { text: allLabel }) as HTMLOptionElement;
  all.value = '';
  select.append(all);
  for (const option of options) {
    select.append(el('option', {
      text: `${option.label} (${count(option.value)})`,
      attrs: { value: option.value },
    }));
  }
  select.value = selected[0] ?? '';
  select.addEventListener('change', () => onChange(select.value));
  return el('label', { class: 'filter-field' }, el('span', { text: label }), select);
}

function readQuery(): SearchQuery {
  const params = new URLSearchParams(window.location.search);
  return {
    q: params.get('q') ?? '',
    capabilityTypes: split(params.get('type')),
    threatCategories: split(params.get('threat')),
    entityTypes: split(params.get('entity')),
    accessLevels: split(params.get('access')),
  };
}

function writeQuery(query: SearchQuery): void {
  const params = new URLSearchParams();
  if (query.q.trim()) params.set('q', query.q);
  if (query.capabilityTypes.length) params.set('type', query.capabilityTypes.join(','));
  if (query.threatCategories.length) params.set('threat', query.threatCategories.join(','));
  if (query.entityTypes.length) params.set('entity', query.entityTypes.join(','));
  if (query.accessLevels.length) params.set('access', query.accessLevels.join(','));
  const next = `${window.location.pathname}${params.size ? `?${params.toString()}` : ''}`;
  window.history.replaceState(null, '', next);
}

function split(value: string | null): string[] {
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];
}
