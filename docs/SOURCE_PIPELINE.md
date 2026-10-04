# Source harvesting and graph integration

The source pipeline deliberately separates cheap deterministic discovery from model-assisted interpretation.

```text
web seeds / RSS / YouTube / OpenAlex / Crossref
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

Discovery supports explicit trusted web pages, RSS/Atom feeds, YouTube channel upload feeds, OpenAlex, Crossref, deterministic URL/DOI/ID deduplication, retry/backoff, and a hard cap on new sources per run. YouTube discovery resolves a configured channel URL to its public channel feed; it stores video metadata/links, not scraped transcripts.

It does not mirror full copyrighted pages. The repository stores source metadata, provenance, and agent-authored summaries.

The scheduled GitHub Action runs twice weekly and opens a PR containing only newly discovered metadata records. Changes to the harvester or its configuration on `main` also trigger a harvest, which makes new source adapters self-testing after merge.

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
5. for specifically Christian claims/arguments/responses/doctrines, set `status.christian` and add relevant `scripture` references from the local WEB corpus,
6. leave `processing.reviewed: false` until a human reviews the change.

A secondary source can suggest a biblical connection, but the agent should inspect the actual passage before adding it. Scripture should directly ground Christian doctrinal claims; on public philosophical arguments it may instead document the Christian worldview behind the reasoning without being treated as a premise the interlocutor must grant.

A source becomes **integrated** automatically as soon as a graph node references it.

## Perspective balance and steelmanning

The map is Christian apologetics, but the research pipeline must not make opposing positions easier to answer by sourcing them mainly through Christian descriptions of them.

Use these rules when integrating disputed material:

1. **Represent the actual position before responding.** Distinguish lack of belief, agnosticism, positive atheism, local skepticism about Christianity, and stronger global claims. Do not silently turn "I am unconvinced" into "I can prove God does not exist."
2. **Prefer direct challengers for objections.** For an important skeptical argument, include a primary skeptical philosopher, scholar, critic, or historical source when available, then pair it with neutral academic reference material where useful.
3. **Steelman before rebuttal.** State the strongest recognizable version of an objection in its own node. Do not embed a Christian answer inside the objection in a way that weakens it before the reader sees the case.
4. **Keep replies separate.** An unresolved skeptical branch is valid graph state. Add Christian defenses, distinctions, or rebuttals as response nodes with their own sources and Scripture where appropriate.
5. **Do not manufacture easy objections.** For example, religious diversity is not simply "many religions exist, therefore none is true"; the evidential problem of evil is not simply the claim that God and any evil are logically incompatible; and miracle skepticism need not assume miracles are metaphysically impossible.
6. **Balance quality, not raw counts.** The goal is not one pro source for every con source. The goal is that every major live dispute can be traced to serious representatives on each relevant side, with advocacy sources distinguished from scholarship and primary evidence.
7. **Corroborate technical claims.** Creator content can be excellent for argument formulation and conversational relevance, but factual, historical, scientific, textual, and philosophical claims should be checked against the best available primary or scholarly material.

Current skeptical/reference anchors include Alex O'Connor, Graham Oppy, William Rowe, Paul Draper, J. L. Schellenberg, David Hume, Bart Ehrman, and neutral reference entries from the Stanford Encyclopedia of Philosophy. This list is illustrative rather than exhaustive.

## Local Scripture corpus

The complete 66-book World English Bible (WEB) is vendored under `data/scripture/web/` for offline lookup and model context. The text is public domain. The JSON snapshot is generated from the official eBible WEB USFM distribution.

Useful commands:

```bash
npm run scripture:stats
npm run scripture:lookup -- Romans 2:14-15
npm run scripture:scan -- content/claims/example.md
```

Graph nodes can declare a `scripture` list. The viewer renders the local WEB passage and generates an ESV link on YouVersion without storing copyrighted ESV text. For substantive nodes with a declared Christian status, Scripture is an authoring requirement and is enforced by graph validation.

Source packets also detect Bible references in the source record and attach local WEB context for the summarization/integration agent.

## Expansion path

Next adapters can use the same candidate contract for curated sitemaps, Google Books/Open Library, citation expansion, and richer topic-aware ranking. Those adapters should keep the same rule: discover broadly, summarize selectively, and integrate only with provenance.


## Curated creator hubs

For recurring public thinkers, keep two levels of source records:

1. a **creator hub** pointing to the official site/channel or ministry archive, tagged with perspective and areas of emphasis;
2. **individual work records** for talks, debates, articles, podcast episodes, or books that make claims we actually want to cite.

Current curated hubs include John Lennox; Cliffe and Stuart Knechtle / Give Me An Answer; Big Jon Steel; Nicholas Bowling; Bryce Crawford; Alex O'Connor / Within Reason; Bart D. Ehrman; William Lane Craig / Reasonable Faith; and Wes Huff.

Perspective tags are descriptive, not quality scores. Alex O'Connor is indexed as an atheist/agnostic-atheist skeptical source, while the Christian creators are tagged Christian and, where appropriate, apologetics or evangelism. A debate containing multiple perspectives should use `stance: mixed`.

Creator hubs are also retained as explicit web seeds in `config/source-harvest.yml`. The repository does not mirror full copyrighted transcripts. Agent summaries should extract arguments, objections, distinctions, and useful locators while linking back to the original work.

When a creator's claim is factual or technical, prefer integrating the argument formulation from the creator while also adding independent primary or scholarly corroboration. This keeps advocacy sources useful without confusing them with neutral evidence.
