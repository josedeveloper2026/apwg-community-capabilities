export function page(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base}${path.replace(/^\//, '')}`;
}

export function entityUrl(entityId: string): string {
  return `${page('entity/')}?id=${encodeURIComponent(entityId)}`;
}

export function capabilityUrl(capabilityId: string): string {
  return `${page('capability/')}?id=${encodeURIComponent(capabilityId)}`;
}

export function editUrl(entityId?: string): string {
  return entityId ? `${page('add/')}?entity=${encodeURIComponent(entityId)}` : page('add/');
}

export function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}
