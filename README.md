# Apologetics Map

Apologetics Map is a version-controlled knowledge graph for Christian theology, apologetics, objections, counterarguments, evidence, sources, and worldview comparisons.

The canonical data is plain Markdown with YAML frontmatter. Each file represents one reusable intellectual node. Relationships in frontmatter turn those files into a directed graph that powers article-style reference pages, a global atlas, and focused debate-line views.

## Live site

The production viewer deploys from `main` to GitHub Pages:

**https://drecg96-org.github.io/apologetics-map/**

## Viewer roles

- **Debate Explorer** is the primary interaction: follow one debate position at a time, choose common responses, and keep the nested line visible.
- **Debate Map** is a secondary spatial view for orienting yourself in conversational branches.
- **Knowledge Graph** is a secondary semantic view for inspecting support, objections, dependencies, evidence, and related structure.

## Agent / automation quick start

**If you are an agent working in this repository, prefer the graph CLI over scanning every Markdown file.** The CLI loads the same validated canonical graph used by the site and returns bounded JSON that is cheaper and easier to reason over.

For most tasks, start with a packet around the node you are working on:

```bash
npm run graph -- packet objective-morality --depth 2
```

Use the narrower commands when you only need one kind of context:

- `node <id>` — complete node plus incoming/outgoing semantic and debate edges.
- `line <id> --depth N` — conversational move tree, including terminal commitments.
- `neighbors <id> --depth N` — bounded semantic/debate neighborhood.
- `path <from> <to>` — shortest structural path between two nodes.
- `search <query>` — find node IDs from titles, summaries, bodies, tags, topics, and aliases.
- `topic <topic-id>` — retrieve a topic grouped by node type.
- `sources <id>` — retrieve the sources cited by a node and their processing metadata.
- `stats` — graph/source coverage and maintenance signals.

The CLI is deterministic and contains no LLM logic. Treat the Markdown/YAML under `content/` as canonical; use CLI output as a read/query layer, and validate any edits with `npm run validate`.

See [docs/AGENT_GRAPH_CLI.md](docs/AGENT_GRAPH_CLI.md) for the full command contract and workflow guidance.

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
  graph-cli.ts
  validate-graph.ts
docs/
  AGENT_GRAPH_CLI.md
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

## Agent graph CLI

The graph can be queried deterministically without loading the whole repository into an agent context.

```bash
npm run graph -- node objective-morality
npm run graph -- neighbors objective-morality --depth 2
npm run graph -- line morality-is-subjective --depth 4
npm run graph -- path objective-morality moral-grounding-theism
npm run graph -- search "moral error"
npm run graph -- topic morality
npm run graph -- sources objective-morality
npm run graph -- stats
npm run graph -- packet objective-morality --depth 2
```

Commands emit JSON by default and support `--compact` for one-line output. See [docs/AGENT_GRAPH_CLI.md](docs/AGENT_GRAPH_CLI.md).

## Validate and build

```bash
npm run validate
npm run build
```

Pull requests run graph validation, graph-CLI smoke tests, and the production Astro build automatically. A merge to `main` triggers the GitHub Pages deployment workflow.

**Design rule:** the canonical source data remains a graph. Semantic relationships describe what claims do to one another; conversation flow separately describes which move can follow which in a debate.
