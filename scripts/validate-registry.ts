import exampleJson from '../src/schemas/example.json';
import { getPublishedRegistry } from '../src/lib/registry-store.ts';
import { groupCapabilities, searchCapabilities } from '../src/lib/search.ts';
import type { ValidationResult } from '../src/lib/types.ts';
import { validateRegistry } from '../src/lib/validate.ts';

const files: Array<[string, unknown]> = [
  ['src/data/registry.json', getPublishedRegistry()],
  ['src/schemas/example.json', exampleJson],
];

let failed = false;
for (const [name, value] of files) {
  const result = validateRegistry(value);
  report(name, result);
  if (!result.ok || result.issues.some((issue) => issue.severity === 'warning')) failed = true;
}

const registry = getPublishedRegistry();
const phishing = searchCapabilities(registry, {
  q: 'phishing',
  capabilityTypes: [],
  threatCategories: [],
  entityTypes: [],
  accessLevels: [],
});
const datasets = searchCapabilities(registry, {
  q: '',
  capabilityTypes: ['dataset'],
  threatCategories: [],
  entityTypes: [],
  accessLevels: [],
});
const chong = searchCapabilities(registry, {
  q: 'chong lua dao',
  capabilityTypes: [],
  threatCategories: [],
  entityTypes: [],
  accessLevels: [],
});
const grouped = groupCapabilities(phishing, true);

if (phishing.length < 3) fail('expected several phishing matches');
if (!datasets.some((hit) => hit.capability.capability_id === 'cap-abuse-bazaar')) fail('MalwareBazaar was not found as a dataset');
if (!chong.some((hit) => hit.entity.entity_id === 'org-chongluadao')) fail('folded search missed ChongLuaDao');
if (!grouped.some((group) => group.id === 'operational' && group.hits.length > 0)) fail('operational group was empty');

if (failed) throw new Error('Registry validation failed');
console.log(`Registry OK: ${registry.entities.length} organizations, ${registry.entities.reduce((sum, entity) => sum + entity.capabilities.length, 0)} capabilities.`);

function report(name: string, result: ValidationResult): void {
  for (const issue of result.issues) console.error(`${name} ${issue.severity} ${issue.path}: ${issue.message}`);
}

function fail(message: string): void {
  console.error(message);
  failed = true;
}
