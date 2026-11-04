import type { Capability, Contact, Entity, Publication } from './types';

export function blankContact(): Contact {
  return { name: '', title: '', role: 'primary', email: '', profile_url: '' };
}

export function blankPublication(): Publication {
  return {
    title: '',
    authors: [],
    year: null,
    venue: '',
    doi: '',
    url: '',
    relationship: 'describes_capability',
  };
}

export function blankCapability(): Capability {
  return {
    capability_id: '',
    name: '',
    capability_type: 'detection_service',
    summary: '',
    description: '',
    threat_categories: [],
    keywords: [],
    data_characteristics: {
      data_types: [],
      formats: [],
      update_frequency: null,
      geographic_coverage: [],
      temporal_coverage: null,
    },
    interface: {
      delivery_methods: [],
      endpoint_url: null,
      documentation_url: null,
      input: null,
      output: null,
    },
    access: {
      availability: 'unverified',
      access_level: 'unknown',
      request_url: null,
      authentication: 'unknown',
      license: null,
      usage_restrictions: [],
      privacy_notes: null,
    },
    points_of_contact: [],
    related_publications: [],
    references: {
      project_url: null,
      repository_url: null,
      dataset_url: null,
      presentation_url: null,
    },
    verification: {
      status: 'unverified',
      sharing_confirmed: false,
      claimed_by_provider: false,
      source_url: null,
      last_verified_at: null,
    },
  };
}

export function blankEntity(): Entity {
  return {
    entity_id: '',
    name: '',
    entity_type: 'academic',
    description: '',
    website: '',
    logo_url: null,
    country: '',
    parent_institution: '',
    department: '',
    points_of_contact: [blankContact()],
    capabilities: [blankCapability()],
  };
}
