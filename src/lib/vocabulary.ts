export interface VocabItem {
  value: string;
  label: string;
  description?: string;
}

export const SCHEMA_VERSION = '0.1.0';

export const ENTITY_TYPES: VocabItem[] = [
  { value: 'academic', label: 'Academic' },
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'government', label: 'Government' },
  { value: 'community', label: 'Community' },
  { value: 'other', label: 'Other' },
];

export const CAPABILITY_TYPES: VocabItem[] = [
  { value: 'dataset', label: 'Dataset' },
  { value: 'intelligence_feed', label: 'Intelligence feed' },
  { value: 'detection_service', label: 'Detection service' },
  { value: 'collection_service', label: 'Collection service' },
  { value: 'analysis_tool', label: 'Analysis tool' },
  { value: 'research_model', label: 'Research' },
  { value: 'platform', label: 'Platform' },
  { value: 'other', label: 'Other' },
];

export const THREAT_CATEGORIES: VocabItem[] = [
  { value: 'phishing', label: 'Phishing' },
  { value: 'scam', label: 'Scam' },
  { value: 'malware', label: 'Malware' },
  { value: 'ransomware', label: 'Ransomware' },
  { value: 'credential_theft', label: 'Credential theft' },
  { value: 'brand_impersonation', label: 'Brand impersonation' },
  { value: 'malicious_infrastructure', label: 'Malicious infrastructure' },
  { value: 'dark_web', label: 'Dark web' },
  { value: 'social_engineering', label: 'Social engineering' },
  { value: 'financial_fraud', label: 'Financial fraud' },
  { value: 'other', label: 'Other' },
];

export const ACCESS_LEVELS: VocabItem[] = [
  { value: 'public', label: 'Public' },
  { value: 'registration_required', label: 'Registration required' },
  { value: 'request_only', label: 'Request only' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'unknown', label: 'Unknown' },
];

export const VERIFICATION_STATUSES: VocabItem[] = [
  {
    value: 'unverified',
    label: 'Unverified',
    description: 'A public mention exists, but an operational service or dataset has not been confirmed.',
  },
  {
    value: 'documented',
    label: 'Documented',
    description: 'A public source describes the capability. The provider has not confirmed this registry record.',
  },
  {
    value: 'provider_confirmed',
    label: 'Provider confirmed',
    description: 'The provider has reviewed this registry record.',
  },
];

export const DELIVERY_METHODS: VocabItem[] = [
  { value: 'download', label: 'Download' },
  { value: 'api', label: 'API' },
  { value: 'web_portal', label: 'Web portal' },
  { value: 'stream', label: 'Stream' },
  { value: 'on_request', label: 'On request' },
  { value: 'software', label: 'Software' },
];

export const AVAILABILITY: VocabItem[] = [
  { value: 'operational', label: 'Operational' },
  { value: 'published', label: 'Published' },
  { value: 'limited', label: 'Limited' },
  { value: 'discontinued', label: 'Discontinued' },
  { value: 'unverified', label: 'Unverified' },
];

export const RELATIONSHIPS: VocabItem[] = [
  { value: 'describes_capability', label: 'Describes this capability' },
  { value: 'presented_at_ecrime', label: 'Presented at eCrime' },
  { value: 'related_research', label: 'Related research' },
  { value: 'cites_data', label: 'Cites this data' },
];

export const COUNTRY_NAMES: Record<string, string> = {
  AD: 'Andorra',
  CA: 'Canada',
  DE: 'Germany',
  ES: 'Spain',
  GB: 'United Kingdom',
  US: 'United States',
  VN: 'Vietnam',
};

export function valuesOf(items: VocabItem[]): string[] {
  return items.map((item) => item.value);
}

export function labelOf(items: VocabItem[], value: string | null | undefined): string {
  if (!value) return 'Not listed';
  return items.find((item) => item.value === value)?.label ?? humanize(value);
}

export function humanize(value: string): string {
  return value.replaceAll('_', ' ');
}
