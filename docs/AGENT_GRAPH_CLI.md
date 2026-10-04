# Agent graph CLI

The graph CLI provides a deterministic, JSON-first query layer over the canonical Markdown graph. It is intended for agents, GitHub Actions, and local debugging. It contains no LLM logic.

## Why it exists

Agents should not need to scan every Markdown file or reconstruct graph structure for routine questions. The CLI exposes bounded graph queries through the same validated loader used by the site.

Run commands with:

```bash
npm run graph -- <command> [args] [--flags]
```

JSON is pretty-printed by default. Add `--compact` for one-line JSON.

## Commands

### Node

```bash
npm run graph -- node objective-morality
```

Returns the full node record and body plus incoming/outgoing semantic relationships and previous/next debate moves.

### Neighborhood

```bash
npm run graph -- neighbors objective-morality --depth 2
npm run graph -- neighbors objective-morality --depth 2 --mode semantic
npm run graph -- neighbors objective-morality --depth 2 --mode flow
```

Returns a bounded undirected neighborhood. `--mode` can be `all`, `semantic`, or `flow`.

### Debate line

```bash
npm run graph -- line morality-is-subjective --depth 4
```

Follows outgoing conversational moves as a nested tree. Terminal accepted commitments, concessions, and unresolved endpoints are included directly on the relevant node.

### Path

```bash
npm run graph -- path objective-morality moral-grounding-theism
npm run graph -- path objective-morality moral-grounding-theism --mode flow
```

Finds the shortest traversable path. Traversal is bidirectional so it can answer structural connection questions even when semantic arrows point the other way.

### Search

```bash
npm run graph -- search "moral error"
npm run graph -- search "evolutionary debunking" --limit 5
```

Searches ids, titles, summaries, bodies, topics, aliases, and tags. Exact id/title matches rank highest.

### Topic

```bash
npm run graph -- topic morality
```

Returns all members of a topic grouped by node type.

### Sources

```bash
npm run graph -- sources objective-morality
```

Returns sources cited by the node, including reference notes, source metadata, and processing state.

### Stats

```bash
npm run graph -- stats
```

Returns graph counts plus useful maintenance signals:

- semantic edge and debate-move counts,
- debate openings, terminal nodes, and accidental-looking dead ends,
- structured vs. unstructured argument coverage,
- inference-challenge coverage and formal inferences with no mapped inference-level objection,
- premise claims that currently lack direct support or challenge,
- evidence nodes with and without source references,
- source-heavy debate nodes that may need evidence atomization,
- indexed sources still awaiting summaries,
- summarized sources not yet integrated,
- unreviewed model-authored summaries,
- debate nodes without references,
- orphaned debate nodes.

This is intentionally descriptive. Not every reported dead end or unsourced node is necessarily a defect.

### Agent packet

```bash
npm run graph -- packet objective-morality --depth 2
```

Produces a bounded context packet containing:

- the complete root node and body, including formal argument structure or inference-challenge targets when present,
- nearby semantic and debate nodes,
- edges inside the requested neighborhood,
- an outgoing nested debate line,
- cited source summaries and metadata,
- local WEB Scripture context plus ESV YouVersion links.

This is the preferred entry point for an agent asked to deepen, critique, summarize, or extend one part of the graph.

## Workflow use

The CLI is deterministic and safe to call from CI. The validation workflow smoke-tests representative commands on every pull request.

A future unattended LLM workflow should use the CLI only to prepare bounded context. Model calls and proposed edits should remain a separate stage, followed by normal graph validation and review.
