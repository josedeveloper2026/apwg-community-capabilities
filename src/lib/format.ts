import type { Capability, Entity } from './types';
import {
  ACCESS_LEVELS,
  AVAILABILITY,
  CAPABILITY_TYPES,
  COUNTRY_NAMES,
  ENTITY_TYPES,
  RELATIONSHIPS,
  THREAT_CATEGORIES,
  VERIFICATION_STATUSES,
  labelOf,
} from './vocabulary';

export type Family = 'operational' | 'data' | 'research' | 'other';

export function countryLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  return COUNTRY_NAMES[code] ?? code;
}

export function entityTypeLabel(value: string | null | undefined): string {
  return labelOf(ENTITY_TYPES, value);
}

export function capabilityTypeLabel(value: string | null | undefined): string {
  return labelOf(CAPABILITY_TYPES, value);
}

export function threatLabel(value: string): string {
  return labelOf(THREAT_CATEGORIES, value);
}

export function accessLabel(value: string | null | undefined): string {
  return labelOf(ACCESS_LEVELS, value ?? 'unknown');
}

export function verificationLabel(value: string | null | undefined): string {
  return labelOf(VERIFICATION_STATUSES, value ?? 'unverified');
}

export function availabilityLabel(value: string | null | undefined): string {
  return labelOf(AVAILABILITY, value ?? 'unverified');
}

export function relationshipLabel(value: string | null | undefined): string {
  return labelOf(RELATIONSHIPS, value);
}

export function familyOf(capability: Capability): Family {
  const type = capability.capability_type;
  const status = capability.verification?.status;
  const availability = capability.access?.availability;
  if (type === 'dataset') return 'data';
  if (type === 'other') return 'other';
  if (type === 'research_model' || status === 'unverified' || availability === 'unverified') {
    return 'research';
  }
  return 'operational';
}

export function familyLabel(family: Family): string {
  switch (family) {
    case 'operational':
      return 'Operational';
    case 'data':
      return 'Dataset';
    case 'research':
      return 'Research';
    default:
      return 'Program';
  }
}

export function summaryOf(capability: Capability): string {
  const summary = capability.summary?.trim();
  if (summary) return summary;
  return capability.description.trim();
}

export function contactLine(entity: Entity): string | null {
  const contact = entity.points_of_contact?.find((item) => item.email) ?? entity.points_of_contact?.[0];
  if (!contact) return null;
  return contact.email ?? contact.name;
}

export function formatCheckedDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function verificationNarrative(capability: Capability): string {
  const status = capability.verification?.status ?? 'unverified';
  if (status === 'provider_confirmed') {
    return 'The provider has reviewed this registry record.';
  }
  if (status === 'documented') {
    const claim = capability.verification?.claimed_by_provider
      ? 'The description comes from the provider’s public website.'
      : 'The description comes from a public source other than a provider confirmation.';
    return `${claim} The provider has not confirmed this registry record.`;
  }
  return 'An operational service, dataset, or sharing arrangement has not been confirmed. The listing records a public mention only.';
}
