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


## Curated creator hubs

For recurring public thinkers, keep two levels of source records:

1. a **creator hub** pointing to the official site/channel or ministry archive, tagged with perspective and areas of emphasis;
2. **individual work records** for talks, debates, articles, podcast episodes, or books that make claims we actually want to cite.

Current curated hubs include John Lennox; Cliffe and Stuart Knechtle / Give Me An Answer; Big Jon Steel; Nicholas Bowling; Bryce Crawford; Alex O'Connor / Within Reason; William Lane Craig / Reasonable Faith; and Wes Huff.

Perspective tags are descriptive, not quality scores. Alex O'Connor is indexed as an atheist/agnostic-atheist skeptical source, while the Christian creators are tagged Christian and, where appropriate, apologetics or evangelism. A debate containing multiple perspectives should use `stance: mixed`.

Creator hubs are also retained as explicit web seeds in `config/source-harvest.yml`. The repository does not mirror full copyrighted transcripts. Agent summaries should extract arguments, objections, distinctions, and useful locators while linking back to the original work.

When a creator's claim is factual or technical, prefer integrating the argument formulation from the creator while also adding independent primary or scholarly corroboration. This keeps advocacy sources useful without confusing them with neutral evidence.
