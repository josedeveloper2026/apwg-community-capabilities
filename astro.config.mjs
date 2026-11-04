import { defineConfig } from 'astro/config';

function normalizeBase(value) {
  if (!value || value === '/') return '/';
  const withSlash = value.startsWith('/') ? value : `/${value}`;
  return withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash;
}

export default defineConfig({
  base: normalizeBase(process.env.BASE_PATH),
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});
