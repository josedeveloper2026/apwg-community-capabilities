import seedJson from '../data/registry.json';
import { SCHEMA_VERSION } from './vocabulary';
import type { Entity, Registry } from './types';

const STORAGE_KEY = 'apwg-community-capabilities-overlay-v1';

interface Overlay {
  version: 1;
  entities: Entity[];
}

export type EntityOrigin = 'published' | 'edited' | 'local';

export function getPublishedRegistry(): Registry {
  return structuredClone(seedJson) as Registry;
}

export function loadRegistry(): Registry {
  const published = getPublishedRegistry();
  const overlay = readOverlay();
  const merged = new Map(published.entities.map((entity) => [entity.entity_id, entity]));
  for (const entity of overlay.entities) merged.set(entity.entity_id, structuredClone(entity));
  return {
    schema_version: published.schema_version || SCHEMA_VERSION,
    entities: [...merged.values()],
  };
}

export function entityOrigin(entityId: string): EntityOrigin {
  const published = getPublishedRegistry().entities.some((entity) => entity.entity_id === entityId);
  const local = readOverlay().entities.some((entity) => entity.entity_id === entityId);
  if (local && published) return 'edited';
  if (local) return 'local';
  return 'published';
}

export function hasLocalChanges(): boolean {
  return readOverlay().entities.length > 0;
}

export function saveEntity(entity: Entity): void {
  const overlay = readOverlay();
  const index = overlay.entities.findIndex((item) => item.entity_id === entity.entity_id);
  if (index >= 0) overlay.entities[index] = entity;
  else overlay.entities.push(entity);
  const published = getPublishedRegistry().entities.find((item) => item.entity_id === entity.entity_id);
  if (published && stable(published) === stable(entity)) {
    overlay.entities = overlay.entities.filter((item) => item.entity_id !== entity.entity_id);
  }
  writeOverlay(overlay);
}

export function revertEntity(entityId: string): void {
  const overlay = readOverlay();
  overlay.entities = overlay.entities.filter((entity) => entity.entity_id !== entityId);
  writeOverlay(overlay);
}

export function importRegistry(registry: Registry, mode: 'merge' | 'replace-local'): number {
  const published = new Map(getPublishedRegistry().entities.map((entity) => [entity.entity_id, entity]));
  const overlay = mode === 'replace-local' ? { version: 1 as const, entities: [] } : readOverlay();
  const merged = new Map(overlay.entities.map((entity) => [entity.entity_id, entity]));

  for (const entity of registry.entities) {
    const original = published.get(entity.entity_id);
    if (original && stable(original) === stable(entity)) merged.delete(entity.entity_id);
    else merged.set(entity.entity_id, entity);
  }

  writeOverlay({ version: 1, entities: [...merged.values()] });
  return registry.entities.length;
}

export function resetLocalChanges(): void {
  writeOverlay({ version: 1, entities: [] });
}

export function findEntity(registry: Registry, entityId: string): Entity | undefined {
  return registry.entities.find((entity) => entity.entity_id === entityId);
}

export function findCapability(registry: Registry, capabilityId: string): { entity: Entity; capability: Entity['capabilities'][number] } | undefined {
  for (const entity of registry.entities) {
    const capability = entity.capabilities.find((item) => item.capability_id === capabilityId);
    if (capability) return { entity, capability };
  }
  return undefined;
}

export function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function readOverlay(): Overlay {
  if (typeof localStorage === 'undefined') return { version: 1, entities: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, entities: [] };
    const parsed = JSON.parse(raw) as Overlay;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.entities)) return { version: 1, entities: [] };
    return parsed;
  } catch {
    return { version: 1, entities: [] };
  }
}

function writeOverlay(overlay: Overlay): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overlay));
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stable(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
