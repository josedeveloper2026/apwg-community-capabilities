import { execSync } from 'node:child_process';
import { defineConfig } from 'astro/config';

function siteUpdatedAt() {
  try {
    const iso = execSync('git log -1 --format=%cI', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (iso && !Number.isNaN(Date.parse(iso))) return iso;
  } catch {
    // A build without git still needs a timestamp.
  }
  return new Date().toISOString();
}

function normalizeBase(value) {
  if (!value || value === '/') return '/';
  const withSlash = value.startsWith('/') ? value : `/${value}`;
  return withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash;
}

export default defineConfig({
  base: normalizeBase(process.env.BASE_PATH),
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  vite: {
    define: {
      __SITE_UPDATED_AT__: JSON.stringify(siteUpdatedAt()),
    },
  },
});
