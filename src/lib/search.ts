import { familyOf, type Family } from './format';
import { fold } from './text';
import type { Capability, Entity, Registry } from './types';

export interface SearchQuery {
  q: string;
  capabilityTypes: string[];
  threatCategories: string[];
  entityTypes: string[];
  accessLevels: string[];
}

export interface CapabilityHit {
  entity: Entity;
  capability: Capability;
}

export interface CapabilityGroup {
  id: Family | 'results';
  title: string;
  lede: string;
  hits: CapabilityHit[];
}

const GROUP_COPY: Record<Family, { title: string; lede: string }> = {
  operational: {
    title: 'Operational services and feeds',
    lede: 'Capabilities a provider publicly describes as something others can use.',
  },
  data: {
    title: 'Datasets',
    lede: 'Collections a provider publicly describes.',
  },
  research: {
    title: 'Research',
    lede: 'Studies, models, and conference listings. An operational offering is not confirmed unless the record says so.',
  },
  other: {
    title: 'Methods and programs',
    lede: 'Published methods and initiatives that are not a feed, dataset, or detection service.',
  },
};

export function emptyQuery(): SearchQuery {
  return {
    q: '',
    capabilityTypes: [],
    threatCategories: [],
    entityTypes: [],
    accessLevels: [],
  };
}

export function searchCapabilities(registry: Registry, query: SearchQuery): CapabilityHit[] {
  const tokens = fold(query.q).split(/\s+/).filter(Boolean);
  const hits: CapabilityHit[] = [];

  for (const entity of registry.entities) {
    if (!matchesAny(query.entityTypes, [entity.entity_type])) continue;
    for (const capability of entity.capabilities) {
      if (!matchesAny(query.capabilityTypes, [capability.capability_type])) continue;
      if (!matchesAny(query.threatCategories, capability.threat_categories ?? [])) continue;
      if (!matchesAny(query.accessLevels, [capability.access?.access_level ?? 'unknown'])) continue;
      if (!tokens.every((token) => haystack(entity, capability).includes(token))) continue;
      hits.push({ entity, capability });
    }
  }

  hits.sort((a, b) => {
    const byName = a.capability.name.localeCompare(b.capability.name, 'en');
    if (byName !== 0) return byName;
    return a.entity.name.localeCompare(b.entity.name, 'en');
  });
  return hits;
}

export function groupCapabilities(hits: CapabilityHit[], grouped: boolean): CapabilityGroup[] {
  if (!grouped) {
    return [
      {
        id: 'results',
        title: 'Results',
        lede: '',
        hits,
      },
    ];
  }

  const order: Family[] = ['operational', 'data', 'research', 'other'];
  return order
    .map((id) => ({
      id,
      title: GROUP_COPY[id].title,
      lede: GROUP_COPY[id].lede,
      hits: hits.filter((hit) => familyOf(hit.capability) === id),
    }))
    .filter((group) => group.hits.length > 0);
}

export function isFiltered(query: SearchQuery): boolean {
  return Boolean(
    query.q.trim() ||
      query.capabilityTypes.length ||
      query.threatCategories.length ||
      query.entityTypes.length ||
      query.accessLevels.length,
  );
}

function matchesAny(selected: string[], values: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.some((item) => values.includes(item));
}

function haystack(entity: Entity, capability: Capability): string {
  const publications = capability.related_publications ?? [];
  const contacts = [...(entity.points_of_contact ?? []), ...(capability.points_of_contact ?? [])];
  const parts = [
    entity.name,
    entity.description,
    entity.entity_type,
    entity.country,
    entity.website,
    entity.parent_institution,
    entity.department,
    capability.name,
    capability.summary,
    capability.description,
    capability.capability_type,
    capability.access?.access_level,
    capability.access?.availability,
    capability.verification?.status,
    ...(capability.keywords ?? []),
    ...(capability.threat_categories ?? []),
    ...(capability.data_characteristics?.data_types ?? []),
    ...(capability.data_characteristics?.formats ?? []),
    ...contacts.flatMap((contact) => [contact.name, contact.title, contact.email]),
    ...publications.flatMap((publication) => [publication.title, publication.venue, ...(publication.authors ?? [])]),
  ];
  return fold(parts.filter((part): part is string => Boolean(part)).join(' '));
}
