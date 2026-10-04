# Apologetics Map

Apologetics Map is a version-controlled knowledge graph for Christian theology, apologetics, objections, counterarguments, evidence, sources, and worldview comparisons.

The canonical data is plain Markdown with YAML frontmatter. Each file represents one reusable intellectual node. Relationships in frontmatter turn those files into a directed graph that powers both article-style reference pages and an interactive debate map.

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

Pull requests run both graph validation and the production Astro build automatically.

**Design rule:** the viewer may render a tree or map, but the canonical source data remains a graph.
