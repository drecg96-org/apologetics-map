# Faith Map

Faith Map is a version-controlled knowledge graph for Christian theology, apologetics, objections, counterarguments, evidence, sources, and worldview comparisons.

The canonical data is plain Markdown with YAML frontmatter. Each file represents one reusable intellectual node. Relationships in frontmatter turn those files into a directed graph that can later power a debate-tree ("chess line") viewer, a global atlas, topic pages, search, and study tools.

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
src/schema.ts
scripts/validate-graph.ts
docs/SCHEMA.md
```

See [docs/SCHEMA.md](docs/SCHEMA.md) before adding content.

## Validate

Requires Node.js 24+.

```bash
npm install
npm run validate
```

Pull requests run the same validation automatically.

**Design rule:** the viewer may render a tree, but the source data remains a graph.
