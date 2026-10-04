# Apologetics Map

Apologetics Map is a version-controlled knowledge graph for Christian theology, apologetics, objections, counterarguments, evidence, sources, and worldview comparisons.

The canonical data is plain Markdown with YAML frontmatter. Each file represents one reusable intellectual node. Relationships in frontmatter turn those files into a directed graph that powers article-style reference pages, a global atlas, and focused debate-line views.

## Shareable deep links

The site treats URLs as durable references to graph content and explorer state:

- `/node/<id>/` is the canonical page for a note/node.
- `/topic/<id>/` is the canonical page for a topic.
- `/?node=<id>` opens Debate Explorer at a specific position; `path=a,b,c` preserves an exact conversational route when the same node is reachable multiple ways.
- `/maps/?focus=<id>&depth=2` opens a focused subgraph around a node. Map mode, topic/type filters, source visibility, and search text are also kept in the URL.

Use stable node IDs for links. Titles and presentation can change without invalidating those URLs. Explorer navigation updates browser history so Back/Forward restores prior debate positions.


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

**Biblical grounding rule:** specifically Christian claims, arguments, responses, and doctrines should be rooted in Scripture rather than only in later apologetic or theological sources. Mark the node's `status.christian` and add relevant `scripture:` references. Validation requires Scripture on substantive nodes with a declared Christian status. For public philosophical arguments, Scripture can document the Christian worldview behind the argument without being presented as a premise a non-Christian must already accept.

Use the vendored World English Bible for reliable lookup:

```bash
npm run scripture:lookup -- Romans 2:14-15
```

Node pages render the local WEB text and provide an ESV YouVersion link automatically. See [docs/SCHEMA.md](docs/SCHEMA.md) for the authoring policy and [docs/AGENT_GRAPH_CLI.md](docs/AGENT_GRAPH_CLI.md) for the full graph command contract.

## Node feedback issues

Every canonical node page includes **Respond / ask a question**. The form captures a reader's question, response, objection, correction, or request for evidence. Without backend configuration it opens a prefilled GitHub issue; with the optional Cloudflare Worker + GitHub App configured it submits directly through the site.

These issues use the title prefix `[Node feedback]` and include a `<!-- node-feedback:v1 -->` marker plus:

- the contribution type and reader text,
- canonical node ID, node type, page URL, and content-file path,
- topic context,
- previous debate moves and possible next moves.

For agent triage, search open issues for the `[Node feedback]` prefix, extract the node ID, then start with:

```bash
npm run graph -- packet <node-id> --depth 2
```

Treat the issue as proposed conversational input, not automatically-correct graph content. Check sources and nearby argument structure before editing Markdown, and close or reference the issue from the integrating PR.

**Issues contain conversations; nodes contain ideas.** Keep canonical node types semantic and record user-feedback provenance with `origin.github_issues`. See [docs/NODE_FEEDBACK_SETUP.md](docs/NODE_FEEDBACK_SETUP.md) for GitHub App/Cloudflare setup and the complete issue-to-graph workflow.


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
