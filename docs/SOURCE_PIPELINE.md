# Source harvesting and graph integration

The source pipeline deliberately separates cheap deterministic discovery from model-assisted interpretation.

```text
web seeds / OpenAlex / Crossref
            ↓
      source harvester
            ↓
discovered + indexed source node
            ↓
      Source Library queue
            ↓
      agent summary packet
            ↓
 summary + proposed references/nodes
            ↓
       graph integration
            ↓
        human review
```

## Processing states

Source Markdown can include:

```yaml
processing:
  discovered: true
  indexed: true
  summarized: false
  reviewed: false
  discovery:
    provider: openalex
    query: objective moral obligations God
    retrieved_at: 2026-10-04T12:00:00Z
```

**Integrated is not stored as a boolean.** It is derived from the canonical graph: a source is integrated when at least one non-source node references it. This prevents stale state.

## Harvest

Configuration lives in `config/source-harvest.yml`.

```bash
npm run sources:harvest -- --dry-run
npm run sources:harvest
```

The first implementation intentionally limits itself to explicit trusted web pages (metadata fetch only), OpenAlex, Crossref, deterministic URL/DOI/ID deduplication, and a hard cap on new sources per run.

It does not mirror full copyrighted pages. The repository stores source metadata, provenance, and agent-authored summaries.

The scheduled GitHub Action runs twice weekly and opens a PR containing only newly discovered metadata records.

## Agent handoff

Choose an indexed source from the Source Library and generate a context packet:

```bash
npm run sources:packet -- sep-moral-arguments-god
```

The packet contains source metadata plus the existing graph neighborhood for the same topic. An agent should then:

1. read the original source,
2. write a neutral summary and limitations,
3. set `processing.summarized: true` and increment `summary_version`,
4. add narrowly justified references or graph nodes,
5. leave `processing.reviewed: false` until a human reviews the change.

A source becomes **integrated** automatically as soon as a graph node references it.

## Expansion path

Next adapters can use the same candidate contract: YouTube channel upload metadata, RSS/Atom, curated sitemaps, Google Books/Open Library, and Scripture-reference extraction. Those adapters should keep the same rule: discover broadly, summarize selectively, and integrate only with provenance.
