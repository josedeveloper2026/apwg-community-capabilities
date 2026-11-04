export interface Registry {
  schema_version: string;
  entities: Entity[];
}

export interface Entity {
  entity_id: string;
  name: string;
  entity_type: string;
  description: string;
  website?: string | null;
  logo_url?: string | null;
  country?: string | null;
  parent_institution?: string | null;
  department?: string | null;
  points_of_contact?: Contact[];
  capabilities: Capability[];
}

export interface Contact {
  name: string;
  title?: string | null;
  role?: string | null;
  email?: string | null;
  profile_url?: string | null;
}

export interface Capability {
  capability_id: string;
  name: string;
  capability_type: string;
  summary?: string | null;
  description: string;
  threat_categories?: string[];
  keywords?: string[];
  data_characteristics?: DataCharacteristics | null;
  interface?: CapabilityInterface | null;
  access?: Access | null;
  points_of_contact?: Contact[];
  related_publications?: Publication[];
  references?: References | null;
  verification?: Verification | null;
}

export interface DataCharacteristics {
  data_types?: string[];
  formats?: string[];
  update_frequency?: string | null;
  geographic_coverage?: string[];
  temporal_coverage?: string | null;
}

export interface FieldSpec {
  name: string;
  type?: string | null;
  required?: boolean;
  description?: string | null;
}

export interface InterfacePayload {
  description?: string | null;
  format?: string | null;
  fields?: FieldSpec[];
}

export interface CapabilityInterface {
  delivery_methods?: string[];
  endpoint_url?: string | null;
  documentation_url?: string | null;
  input?: InterfacePayload | null;
  output?: InterfacePayload | null;
}

export interface Access {
  availability?: string | null;
  access_level?: string | null;
  request_url?: string | null;
  authentication?: string | null;
  license?: string | null;
  usage_restrictions?: string[];
  privacy_notes?: string | null;
}

export interface Publication {
  title: string;
  authors?: string[];
  year?: number | null;
  venue?: string | null;
  doi?: string | null;
  url?: string | null;
  relationship?: string | null;
}

export interface References {
  project_url?: string | null;
  repository_url?: string | null;
  dataset_url?: string | null;
  presentation_url?: string | null;
}

export interface Verification {
  status?: string | null;
  sharing_confirmed?: boolean;
  claimed_by_provider?: boolean;
  source_url?: string | null;
  last_verified_at?: string | null;
}

export interface Issue {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  ok: boolean;
  issues: Issue[];
}
