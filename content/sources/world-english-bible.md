---
id: world-english-bible
title: World English Bible
type: source
summary: Public-domain English Bible used as the local Scripture corpus for passage lookup, reference validation, and model context.
topics:
  - christianity
relationships: []
tags:
  - scripture
  - public-domain
status:
  editorial: reviewed
processing:
  discovered: true
  indexed: true
  summarized: true
  reviewed: true
  summary_version: 1
  discovery:
    provider: manual
    retrieved_at: 2026-10-04T13:15:00Z
    external_id: engwebp
source:
  kind: scripture
  publisher: eBible.org
  url: https://ebible.org/details.php?id=engwebp
  role: reference
  difficulty: beginner
  stance: neutral
---

# Local corpus

The full 66-book World English Bible Protestant Edition is vendored in `data/scripture/web/` for offline passage lookup.

The corpus is used for machine-readable context and quoting within the project. Reader-facing ESV links are generated separately through YouVersion; copyrighted ESV text is not stored locally.
