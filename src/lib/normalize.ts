import type { Entity } from './types';

export function prepareEntity(input: Entity): Entity {
  const entity = structuredClone(input);
  entity.name = entity.name.trim();
  entity.description = entity.description.trim();
  entity.entity_id = entity.entity_id.trim();
  entity.entity_type = entity.entity_type.trim();
  entity.website = clean(entity.website);
  entity.country = clean(entity.country);
  entity.parent_institution = clean(entity.parent_institution);
  entity.department = clean(entity.department);
  entity.logo_url = clean(entity.logo_url);
  entity.points_of_contact = (entity.points_of_contact ?? [])
    .map((contact) => ({
      name: contact.name.trim(),
      title: clean(contact.title),
      role: clean(contact.role) ?? 'primary',
      email: clean(contact.email),
      profile_url: clean(contact.profile_url),
    }))
    .filter((contact) => contact.name);

  entity.capabilities = entity.capabilities.map((capability) => {
    const next = structuredClone(capability);
    next.capability_id = next.capability_id.trim();
    next.name = next.name.trim();
    next.capability_type = next.capability_type.trim();
    next.summary = clean(next.summary);
    next.description = next.description.trim();
    next.keywords = compact(next.keywords);
    next.threat_categories = compact(next.threat_categories);
    if (next.data_characteristics) {
      next.data_characteristics.data_types = compact(next.data_characteristics.data_types);
      next.data_characteristics.formats = compact(next.data_characteristics.formats);
      next.data_characteristics.geographic_coverage = compact(next.data_characteristics.geographic_coverage);
      next.data_characteristics.update_frequency = clean(next.data_characteristics.update_frequency);
      next.data_characteristics.temporal_coverage = clean(next.data_characteristics.temporal_coverage);
    }
    if (next.interface) {
      next.interface.delivery_methods = compact(next.interface.delivery_methods);
      next.interface.endpoint_url = clean(next.interface.endpoint_url);
      next.interface.documentation_url = clean(next.interface.documentation_url);
    }
    if (next.access) {
      next.access.availability = clean(next.access.availability);
      next.access.access_level = clean(next.access.access_level);
      next.access.request_url = clean(next.access.request_url);
      next.access.authentication = clean(next.access.authentication);
      next.access.license = clean(next.access.license);
      next.access.privacy_notes = clean(next.access.privacy_notes);
      next.access.usage_restrictions = compact(next.access.usage_restrictions);
    }
    if (next.references) {
      next.references.project_url = clean(next.references.project_url);
      next.references.repository_url = clean(next.references.repository_url);
      next.references.dataset_url = clean(next.references.dataset_url);
      next.references.presentation_url = clean(next.references.presentation_url);
    }
    if (next.verification) {
      next.verification.status = clean(next.verification.status);
      next.verification.source_url = clean(next.verification.source_url);
      next.verification.last_verified_at = clean(next.verification.last_verified_at);
    }
    next.related_publications = (next.related_publications ?? [])
      .map((publication) => ({
        title: publication.title.trim(),
        authors: compact(publication.authors),
        year: publication.year ?? null,
        venue: clean(publication.venue),
        doi: clean(publication.doi),
        url: clean(publication.url),
        relationship: clean(publication.relationship),
      }))
      .filter((publication) => publication.title);
    return next;
  });

  return entity;
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
}

function compact(values: string[] | null | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}
