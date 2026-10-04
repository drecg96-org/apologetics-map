# Apologetics Map node schema

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

Do not duplicate inverse edges. The viewer derives incoming relationships from the canonical outgoing edges.

## Conversation flow

Semantic relationships and conversational order are deliberately separate.

```yaml
conversation:
  opening: false
  follows:
    - objective-morality
  label: objection
  priority: 30
  terminal:
    kind: accepted-commitment
    label: Position accepted
    note: No contradiction has been established; this debate line intentionally stops here.
```

- `follows` lists the node IDs that can immediately precede this node in a debate.
- `opening: true` marks a useful starting position.
- `label` is the short move label shown on debate-flow edges.
- `priority` is an optional non-negative integer used to keep common branches visually ordered.
- `terminal` marks an intentional endpoint rather than an unmapped dead end. Supported kinds are `accepted-commitment`, `concession`, and `unresolved`. Use `label` and `note` to explain why the line ends.

## Formal argument structure

Argument nodes can optionally expose a machine-readable premise/inference/conclusion map in addition to their prose explanation.

```yaml
argument:
  form: abductive
  statements:
    - id: p1
      node: objective-morality
      role: premise
      label: P1
      note: Optional explanation of this statement's role in this argument.
    - id: p2
      node: theistic-grounding-has-explanatory-advantages
      role: premise
      label: P2
    - id: c1
      node: moral-grounding-theism
      role: conclusion
      label: C
  inferences:
    - id: i1
      from:
        - p1
        - p2
      to: c1
      kind: abductive
      label: best explanation
      note: Optional explanation of the inferential move.
```

Supported argument/inference forms are `deductive`, `inductive`, `abductive`, `transcendental`, `cumulative`, `analogical`, and `other`.

### Authoring rules

- Formal argument structure is valid only on nodes whose `type` is `argument`.
- Every statement points to a reusable `claim` node. Do not hide a disputable proposition only inside the argument record.
- `premise` statements are inputs. `intermediate-conclusion` and `conclusion` statements must be produced by an inference.
- Inference `from` and `to` values refer to local statement IDs within that argument, not global node IDs.
- Use semantic relationships on the referenced claim nodes for ordinary support and challenge. The formal structure answers a different question: **how are these propositions combined in this particular argument?**
- An argument can reuse the same claim that another argument uses. This is intentional: evidence and objections attached to that claim become relevant wherever the premise appears.
- The prose body should still explain the formulation, assumptions, limits, and strongest pressure points. The mapper is an inspectable logical skeleton, not a replacement for argumentation.

The validator checks that statement references resolve to claim nodes, local statement/inference IDs are unique, and non-premise statements are actually produced by an inference.

### Challenging an inference

Sometimes an interlocutor grants the stated premises but rejects the move from those premises to the conclusion. Do not force that objection onto one premise if the real target is the inference itself.

Objection nodes can declare:

```yaml
inference_challenges:
  - argument: transcendental-argument-for-christian-theism
    inference: i2
    note: The objection grants the prior statements but denies that they establish the stronger conclusion.
```

Rules:

- `inference_challenges` is valid only on `objection` nodes.
- `argument` must resolve to an argument node with formal structure.
- `inference` must be a local inference ID on that argument.
- Keep the objection as a normal canonical node with sources, conversation flow, and semantic relationships as appropriate.
- Replies target the objection node normally with `responds_to`; do not create a second inference-specific response system.

This field is intentionally narrow. Premise objections should continue to challenge the reusable premise claim itself.

## Topic membership

```yaml
topics:
  - morality
  - apologetics
```

Every topic ID must resolve to a node whose type is `topic`.

## Provenance

Canonical nodes may record where the idea entered the graph without changing the node's semantic type:

```yaml
origin:
  kind: user-feedback
  github_issues:
    - 143
```

Supported origin kinds are `authored`, `user-feedback`, `source-integration`, and `agent-research`. `github_issues` stores positive GitHub issue numbers and can contain multiple independent submissions that resolve to the same canonical idea. An optional `note` may explain unusual provenance.

A user-submitted objection is still `type: objection`; a user-submitted question is still `type: question`. Provenance describes where the node came from, not what the node means.

See [NODE_FEEDBACK_SETUP.md](NODE_FEEDBACK_SETUP.md) for the issue-to-graph triage workflow.

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

## Scripture

Bible passages are first-class node metadata:

```yaml
scripture:
  - reference: Romans 2:14-15
    note: Christian theological context for conscience and moral knowledge.
```

References are parsed against the vendored 66-book World English Bible corpus in `data/scripture/web/`. Node pages show the local WEB text and generate a reader-facing ESV link on YouVersion. Scripture references are separate from scholarly/source references so biblical claims and external evidence remain distinguishable.

### Biblical grounding policy

The Bible is the primary source for claims about what Christianity teaches. Secondary apologetic, philosophical, historical, and confessional sources can explain interpretation, development, or argumentation, but they should not silently replace Scripture as the basis of a specifically Christian claim.

Use these rules when authoring or revising nodes:

- **Christian doctrine/theology:** cite passages that directly establish or materially constrain the claim. The node body should not make a stronger claim than the cited texts support.
- **Christian apologetic or philosophical argument:** include relevant Scripture when it shows the Christian worldview grounding behind the argument. If the argument is intended as public reason for a non-Christian interlocutor, make clear that the biblical passages are theological grounding rather than premises the interlocutor must first grant.
- **Tradition-specific claims:** cite Scripture and also cite the relevant confession, catechism, theologian, or scholarly source that explains the tradition's interpretation.
- **Objections, secular alternatives, and neutral analytical nodes:** Scripture is not required unless the objection or analysis itself turns on biblical interpretation.

For substantive node types `claim`, `argument`, `response`, and `doctrine`, setting `status.christian` to `broad-consensus`, `tradition-specific`, or `contested` makes at least one `scripture` entry mandatory in validation. Agents creating a specifically Christian node must therefore set `status.christian` rather than omitting the classification.

Before adding a passage, inspect the vendored text instead of relying on memory:

```bash
npm run scripture:lookup -- Matthew 22:37-40
```

Prefer a small set of passages with notes explaining exactly how each passage bears on the node. Do not use proof-text volume as a substitute for exegesis or for independent evidence where the debate requires it.

## Source processing

Source nodes may track deterministic discovery and model-assisted summarization:

```yaml
processing:
  discovered: true
  indexed: true
  summarized: false
  reviewed: false
  summary_version: 1
  discovery:
    provider: web # web | openalex | crossref | rss | youtube | manual | other
    query: moral argument objective morality
    retrieved_at: 2026-10-04T12:45:00Z
```

`processing` is valid only on `type: source` nodes. If `summarized: true`, the source must also have a top-level `summary`.

Integration is intentionally **derived**, not stored: a source is integrated when another graph node points to it through `references`.

Optional source metadata also supports:

```yaml
source:
  role: primer
  difficulty: beginner
  stance: supports
  identifiers:
    doi: 10.xxxx/example
    isbn: "..."
    openalex: https://openalex.org/W...
```

Roles: `primer | defense | objection | debate | scholarship | context | reference`.

Difficulty: `beginner | intermediate | advanced`.

Stance: `supports | challenges | mixed | neutral`.

See [SOURCE_PIPELINE.md](SOURCE_PIPELINE.md) for harvesting and agent integration.

## Markdown body

Frontmatter describes the graph. The body explains the node. Useful headings include: claim/objection, why someone holds this, argument, strongest objections, responses, distinctions, evidence, limits/open questions, and conversational formulation.
