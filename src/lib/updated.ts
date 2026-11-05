export interface LatestUpdate {
  iso: string;
  label: string;
}

export function latestUpdate(): LatestUpdate {
  const iso = readUpdatedAt();
  return { iso, label: formatEastern(iso) };
}

function readUpdatedAt(): string {
  const stamp = typeof __SITE_UPDATED_AT__ === 'string' ? __SITE_UPDATED_AT__ : '';
  if (stamp && !Number.isNaN(Date.parse(stamp))) return stamp;
  return new Date().toISOString();
}

function formatEastern(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h12',
    timeZoneName: 'short',
  }).formatToParts(new Date(iso));
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('day')} ${pick('month')} ${pick('year')}, ${pick('hour')}:${pick('minute')} ${pick('dayPeriod')} ${pick('timeZoneName')}`;
}
