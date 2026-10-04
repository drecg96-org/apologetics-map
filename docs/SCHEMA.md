# Faith Map node schema

Every Markdown file beneath `content/` except README files is a graph node.

## Minimal node

```yaml
---
id: objective-morality
title: Some moral truths are objectively true
type: claim
topics:
  - morality
relationships: []
tags:
  - ethics
---
```

IDs are stable lowercase kebab-case slugs.

## Node types

`topic`, `question`, `claim`, `argument`, `objection`, `response`, `evidence`, `source`, `doctrine`, `worldview`.

## Relationships

Relationships are directional:

```yaml
relationships:
  - type: challenges
    target: objective-morality
    note: Optional explanation.
```

Supported types: `supports`, `challenges`, `responds_to`, `depends_on`, `qualifies`, `contradicts`, `related_to`, `evidence_for`, `addresses`.

Do not duplicate inverse edges. The viewer can derive incoming relationships.

## Topic membership

```yaml
topics:
  - morality
  - apologetics
```

Every topic ID must resolve to a node whose type is `topic`.

## Status

```yaml
status:
  editorial: draft
  scholarship: contested
  christian: contested
```

Editorial: `draft | reviewed | stable`.

Scholarship: `unknown | consensus | majority | contested | minority`.

Christian: `unknown | broad-consensus | tradition-specific | contested`.

## References

```yaml
references:
  - source: example-source
    locator: "pp. 10-14"
    note: Optional relevance note.
```

Referenced IDs must exist and have `type: source`.

## Markdown body

Frontmatter describes the graph. The body explains the node. Useful headings include: claim/objection, why someone holds this, argument, strongest objections, responses, distinctions, evidence, limits/open questions, and conversational formulation.
