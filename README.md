# APWG Community Capabilities

A searchable registry of cybersecurity capabilities from the APWG community. It is a static site: discovery runs in the browser, and the published records live in [`src/data/registry.json`](src/data/registry.json).

The question it is meant to answer is what a team can **do** — a feed, a dataset, a detection service, a method — not only what it has published.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Astro prints (usually http://localhost:4321). After dependencies are installed, search and the seed records work without a network connection.

Other commands:

```bash
npm run validate   # check the seed registry and the example record
npm run build      # validate, then write dist/
npm run preview    # serve the production build
```

## What you can do

- Search and filter capabilities by type, threat, organization type, and access.
- Open an organization and see every capability it lists.
- Open a capability for access, publications, and provenance.
- Add or edit records in the browser. They appear in search immediately and stay in `localStorage` on that computer.
- Export or import the registry as JSON.

Browser additions are not part of the published site. To share one, export the JSON and open a pull request that updates `src/data/registry.json`. Do not invent contacts, licenses, endpoints, or sharing terms. Leave unknown fields empty, and do not mark a record provider-confirmed unless the provider reviewed it.

`src/schemas/example.json` is the canonical shape. It is an illustration, not a real organization. `src/schemas/registry.schema.json` is the JSON Schema. New vocabulary values are kept rather than rejected, so later terms do not break older records.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` builds with the repository name as the base path (or `/` for a `*.github.io` site). Pages must be allowed to deploy from GitHub Actions.

For a manual build:

```bash
BASE_PATH=/apwg-community-capabilities npm run build
```

## Provenance

Seed organizations are public groups connected with APWG eCrime 2026, including APWG, Spamhaus, abuse.ch, Shadowserver, ChongLuaDao, the Global Signal Exchange, Oxford Information Labs, BforeAI, Interisle, ISECOM, Operation Shamrock, and research groups named on the symposium program, including the University of North Carolina Wilmington. Public sources were checked on 4 November 2026. Conference sessions without a confirmed service are marked unverified.
