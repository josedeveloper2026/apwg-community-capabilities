import type { Issue, Registry, ValidationResult } from './types';
import {
  ACCESS_LEVELS,
  AVAILABILITY,
  CAPABILITY_TYPES,
  DELIVERY_METHODS,
  ENTITY_TYPES,
  THREAT_CATEGORIES,
  VERIFICATION_STATUSES,
  valuesOf,
} from './vocabulary';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const ENTITY_TYPE_VALUES = new Set(valuesOf(ENTITY_TYPES));
const CAPABILITY_TYPE_VALUES = new Set(valuesOf(CAPABILITY_TYPES));
const THREAT_VALUES = new Set(valuesOf(THREAT_CATEGORIES));
const ACCESS_VALUES = new Set(valuesOf(ACCESS_LEVELS));
const VERIFICATION_VALUES = new Set(valuesOf(VERIFICATION_STATUSES));
const DELIVERY_VALUES = new Set(valuesOf(DELIVERY_METHODS));
const AVAILABILITY_VALUES = new Set(valuesOf(AVAILABILITY));

const URL_FIELDS = new Set([
  'website',
  'logo_url',
  'profile_url',
  'endpoint_url',
  'documentation_url',
  'request_url',
  'url',
  'source_url',
  'project_url',
  'repository_url',
  'dataset_url',
  'presentation_url',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function coerceRegistry(input: unknown): Registry | null {
  if (Array.isArray(input)) {
    return { schema_version: '0.1.0', entities: input as Registry['entities'] };
  }
  if (!isRecord(input)) return null;
  if (Array.isArray(input.entities)) return input as unknown as Registry;
  if (typeof input.entity_id === 'string' && Array.isArray(input.capabilities)) {
    return { schema_version: '0.1.0', entities: [input as unknown as Registry['entities'][number]] };
  }
  return null;
}

export function validateRegistry(input: unknown): ValidationResult {
  const issues: Issue[] = [];

  const error = (path: string, message: string) => issues.push({ path, message, severity: 'error' });
  const warn = (path: string, message: string) => issues.push({ path, message, severity: 'warning' });

  if (!isRecord(input)) {
    error('$', 'Registry must be a JSON object.');
    return { ok: false, issues };
  }

  if (typeof input.schema_version !== 'string' || !input.schema_version.trim()) {
    error('schema_version', 'schema_version is required.');
  }

  if (!Array.isArray(input.entities)) {
    error('entities', 'entities must be an array.');
    return { ok: false, issues };
  }

  const entityIds = new Set<string>();
  const capabilityIds = new Set<string>();

  input.entities.forEach((entity, entityIndex) => {
    const path = `entities[${entityIndex}]`;
    if (!isRecord(entity)) {
      error(path, 'Entity must be an object.');
      return;
    }

    requireString(entity, 'entity_id', path, error);
    requireString(entity, 'name', path, error);
    requireString(entity, 'entity_type', path, error);
    requireString(entity, 'description', path, error);
    checkOptionalUrl(entity, 'website', path, error);
    checkOptionalUrl(entity, 'logo_url', path, error);

    const entityId = stringValue(entity.entity_id);
    if (entityId) {
      if (entityIds.has(entityId)) error(`${path}.entity_id`, `Duplicate entity_id “${entityId}”.`);
      entityIds.add(entityId);
    }

    const entityType = stringValue(entity.entity_type);
    if (entityType && !ENTITY_TYPE_VALUES.has(entityType)) {
      warn(`${path}.entity_type`, `“${entityType}” is not in the current entity-type vocabulary. It is preserved.`);
    }

    if (entity.points_of_contact !== undefined) {
      checkContacts(entity.points_of_contact, `${path}.points_of_contact`, error);
    }

    if (!Array.isArray(entity.capabilities)) {
      error(`${path}.capabilities`, 'capabilities must be an array.');
      return;
    }

    entity.capabilities.forEach((capability, capabilityIndex) => {
      const capPath = `${path}.capabilities[${capabilityIndex}]`;
      if (!isRecord(capability)) {
        error(capPath, 'Capability must be an object.');
        return;
      }

      requireString(capability, 'capability_id', capPath, error);
      requireString(capability, 'name', capPath, error);
      requireString(capability, 'capability_type', capPath, error);
      requireString(capability, 'description', capPath, error);

      const capabilityId = stringValue(capability.capability_id);
      if (capabilityId) {
        if (capabilityIds.has(capabilityId)) {
          error(`${capPath}.capability_id`, `Duplicate capability_id “${capabilityId}”.`);
        }
        capabilityIds.add(capabilityId);
      }

      const capabilityType = stringValue(capability.capability_type);
      if (capabilityType && !CAPABILITY_TYPE_VALUES.has(capabilityType)) {
        warn(
          `${capPath}.capability_type`,
          `“${capabilityType}” is not in the current capability-type vocabulary. It is preserved.`,
        );
      }

      warnUnknownList(capability.threat_categories, THREAT_VALUES, `${capPath}.threat_categories`, 'threat category', warn);
      warnUnknownList(
        capability.interface && isRecord(capability.interface) ? capability.interface.delivery_methods : undefined,
        DELIVERY_VALUES,
        `${capPath}.interface.delivery_methods`,
        'delivery method',
        warn,
      );

      if (capability.access !== undefined && capability.access !== null) {
        if (!isRecord(capability.access)) {
          error(`${capPath}.access`, 'access must be an object.');
        } else {
          const level = stringValue(capability.access.access_level);
          if (level && !ACCESS_VALUES.has(level)) {
            warn(`${capPath}.access.access_level`, `“${level}” is not in the current access-level vocabulary. It is preserved.`);
          }
          const availability = stringValue(capability.access.availability);
          if (availability && !AVAILABILITY_VALUES.has(availability)) {
            warn(
              `${capPath}.access.availability`,
              `“${availability}” is not in the suggested availability vocabulary. It is preserved.`,
            );
          }
          checkOptionalUrl(capability.access, 'request_url', `${capPath}.access`, error);
        }
      }

      if (capability.interface !== undefined && capability.interface !== null) {
        if (!isRecord(capability.interface)) error(`${capPath}.interface`, 'interface must be an object.');
        else {
          checkOptionalUrl(capability.interface, 'endpoint_url', `${capPath}.interface`, error);
          checkOptionalUrl(capability.interface, 'documentation_url', `${capPath}.interface`, error);
        }
      }

      if (capability.references !== undefined && capability.references !== null) {
        if (!isRecord(capability.references)) error(`${capPath}.references`, 'references must be an object.');
        else {
          for (const key of ['project_url', 'repository_url', 'dataset_url', 'presentation_url']) {
            checkOptionalUrl(capability.references, key, `${capPath}.references`, error);
          }
        }
      }

      if (capability.verification !== undefined && capability.verification !== null) {
        if (!isRecord(capability.verification)) {
          error(`${capPath}.verification`, 'verification must be an object.');
        } else {
          const status = stringValue(capability.verification.status);
          if (status && !VERIFICATION_VALUES.has(status)) {
            warn(
              `${capPath}.verification.status`,
              `“${status}” is not in the current verification vocabulary. It is preserved.`,
            );
          }
          if (
            capability.verification.sharing_confirmed !== undefined &&
            typeof capability.verification.sharing_confirmed !== 'boolean'
          ) {
            error(`${capPath}.verification.sharing_confirmed`, 'sharing_confirmed must be true or false.');
          }
          if (
            capability.verification.claimed_by_provider !== undefined &&
            typeof capability.verification.claimed_by_provider !== 'boolean'
          ) {
            error(`${capPath}.verification.claimed_by_provider`, 'claimed_by_provider must be true or false.');
          }
          checkOptionalUrl(capability.verification, 'source_url', `${capPath}.verification`, error);
          const checked = stringValue(capability.verification.last_verified_at);
          if (checked && !DATE.test(checked)) {
            error(`${capPath}.verification.last_verified_at`, 'Use YYYY-MM-DD.');
          }
        }
      }

      if (capability.points_of_contact !== undefined) {
        checkContacts(capability.points_of_contact, `${capPath}.points_of_contact`, error);
      }

      if (capability.related_publications !== undefined && capability.related_publications !== null) {
        if (!Array.isArray(capability.related_publications)) {
          error(`${capPath}.related_publications`, 'related_publications must be an array.');
        } else {
          capability.related_publications.forEach((publication, publicationIndex) => {
            const pubPath = `${capPath}.related_publications[${publicationIndex}]`;
            if (!isRecord(publication)) {
              error(pubPath, 'Publication must be an object.');
              return;
            }
            requireString(publication, 'title', pubPath, error);
            checkOptionalUrl(publication, 'url', pubPath, error);
            if (publication.year !== undefined && publication.year !== null) {
              if (typeof publication.year !== 'number' || publication.year < 1900 || publication.year > 2100) {
                error(`${pubPath}.year`, 'year must be a number from 1900 to 2100.');
              }
            }
            if (publication.authors !== undefined && !Array.isArray(publication.authors)) {
              error(`${pubPath}.authors`, 'authors must be an array of strings.');
            }
          });
        }
      }
    });
  });

  return { ok: !issues.some((issue) => issue.severity === 'error'), issues };
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  error: (path: string, message: string) => void,
) {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) error(`${path}.${key}`, `${key} is required.`);
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function checkOptionalUrl(
  record: Record<string, unknown>,
  key: string,
  path: string,
  error: (path: string, message: string) => void,
) {
  if (!URL_FIELDS.has(key) && key !== 'url') return;
  const value = record[key];
  if (value === undefined || value === null || value === '') return;
  if (typeof value !== 'string' || !isUrl(value)) error(`${path}.${key}`, `${key} must be an http or https URL.`);
}

function checkContacts(value: unknown, path: string, error: (path: string, message: string) => void) {
  if (!Array.isArray(value)) {
    error(path, 'points_of_contact must be an array.');
    return;
  }
  value.forEach((contact, index) => {
    if (!isRecord(contact)) {
      error(`${path}[${index}]`, 'Contact must be an object.');
      return;
    }
    requireString(contact, 'name', `${path}[${index}]`, error);
    const email = contact.email;
    if (email !== undefined && email !== null && email !== '') {
      if (typeof email !== 'string' || !EMAIL.test(email)) {
        error(`${path}[${index}].email`, 'email must be a plain email address.');
      }
    }
    checkOptionalUrl(contact, 'profile_url', `${path}[${index}]`, error);
  });
}

function warnUnknownList(
  value: unknown,
  allowed: Set<string>,
  path: string,
  noun: string,
  warn: (path: string, message: string) => void,
) {
  if (value === undefined || value === null) return;
  if (!Array.isArray(value)) {
    warn(path, `${path} should be an array.`);
    return;
  }
  value.forEach((item) => {
    if (typeof item === 'string' && !allowed.has(item)) {
      warn(path, `“${item}” is not in the current ${noun} vocabulary. It is preserved.`);
    }
  });
}
