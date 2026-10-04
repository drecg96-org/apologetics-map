# Apologetics Map

Apologetics Map is a version-controlled knowledge graph for Christian theology, apologetics, objections, counterarguments, evidence, sources, and worldview comparisons.

The canonical data is plain Markdown with YAML frontmatter. Each file represents one reusable intellectual node. Relationships in frontmatter turn those files into a directed graph that powers article-style reference pages, a global atlas, and focused debate-line views.

## Live site

The production viewer deploys from `main` to GitHub Pages:

**https://drecg96-org.github.io/apologetics-map/**

## Repository layout

```text
content/
  topics/
  claims/
  arguments/
  objections/
  responses/
  evidence/
  sources/
src/
  components/
  layouts/
  lib/
  pages/
  styles/
  schema.ts
scripts/
  validate-graph.ts
docs/
  SCHEMA.md
```

See [docs/SCHEMA.md](docs/SCHEMA.md) before adding content.

## Run locally

Requires Node.js 24+.

```bash
npm install
npm run dev
```

Then open the local Astro URL shown in the terminal.

## Validate and build

```bash
npm run validate
npm run build
```

Pull requests run both graph validation and the production Astro build automatically. A merge to `main` triggers the GitHub Pages deployment workflow.

**Design rule:** the viewer may render a tree or map, but the canonical source data remains a graph.
