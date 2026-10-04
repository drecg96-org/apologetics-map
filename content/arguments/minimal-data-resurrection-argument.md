---
id: minimal-data-resurrection-argument
title: Minimal-data resurrection argument
type: argument
summary: A deliberately modest resurrection argument brackets the most disputed Gospel details and asks whether Jesus' death, early resurrection proclamation, appearance experiences, and embodied resurrection meaning are best explained by a real resurrection.
topics:
  - christianity
relationships:
  - type: addresses
    target: did-jesus-rise-from-the-dead
  - type: depends_on
    target: jesus-was-executed-by-crucifixion
  - type: depends_on
    target: resurrection-proclamation-emerged-very-early
  - type: depends_on
    target: early-followers-had-experiences-interpreted-as-risen-jesus
  - type: depends_on
    target: pauline-resurrection-language-is-embodied
  - type: supports
    target: resurrection-is-best-explanation-of-core-data
conversation:
  follows:
    - which-explanation-best-fits-resurrection-data
  label: test the minimal-data case
  priority: 35
argument:
  form: abductive
  statements:
    - id: p1
      node: jesus-was-executed-by-crucifixion
      role: premise
      label: P1
      note: Start with genuine death by crucifixion.
    - id: p2
      node: resurrection-proclamation-emerged-very-early
      role: premise
      label: P2
      note: Resurrection belief belongs to the early movement.
    - id: p3
      node: early-followers-had-experiences-interpreted-as-risen-jesus
      role: premise
      label: P3
      note: The datum is sincere experience/report, not yet its supernatural cause.
    - id: p4
      node: pauline-resurrection-language-is-embodied
      role: premise
      label: P4
      note: Earliest Pauline resurrection language concerns transformed embodiment rather than mere continuing influence.
    - id: ic1
      node: minimal-resurrection-data-require-explanation
      role: intermediate-conclusion
      label: IC
      note: Even with the empty tomb bracketed, a significant historical cluster remains.
    - id: p5
      node: resurrection-hypothesis-unifies-core-data
      role: premise
      label: P5
      note: If true, resurrection directly explains death-followed-by-appearance and embodied resurrection belief.
    - id: c1
      node: resurrection-is-best-explanation-of-core-data
      role: conclusion
      label: C
      note: This remains an abductive conclusion sensitive to rival explanations and miracle priors.
  inferences:
    - id: i1
      from:
        - p1
        - p2
        - p3
        - p4
      to: ic1
      kind: cumulative
      label: identify a minimal explanandum
      note: Bracket the most disputed Gospel details and retain only the historical cluster that still requires an origin account.
    - id: i2
      from:
        - ic1
        - p5
      to: c1
      kind: abductive
      label: compare explanations
      note: The resurrection conclusion succeeds only if it compares favorably with vision, tradition-development, mixed naturalistic, and agnostic alternatives under defensible background probabilities.
references:
  - source: allison-resurrection-jesus-2021
    note: Mixed scholarly treatment that helps define a modest data set and the limits of inference.
  - source: licona-resurrection-historiographical-2010
    note: Strong affirmative historiographical comparison.
  - source: ludemann-resurrection-of-christ-2004
    note: Strong skeptical pressure showing that several premises can be granted without the conclusion.
scripture:
  - reference: 1 Corinthians 15:3-8
    note: Primary early Christian death, resurrection, and appearance tradition.
  - reference: 1 Corinthians 15:35-54
    note: Paul's transformed-embodiment discussion.
tags:
  - resurrection
  - minimal-facts
  - abduction
status:
  editorial: reviewed
  scholarship: contested
origin:
  kind: agent-research
  github_issues:
    - 60
---

# Argument

This is intentionally a **minimal-data style** argument rather than a maximal list of Gospel details.

It does not require the reader to grant the historical empty tomb before the argument can be inspected.

## Stage 1 — identify the minimal historical cluster

The case begins with death, early proclamation, sincere appearance experiences, and early embodied resurrection meaning.

Those facts create a historical origin problem even if several later narrative details are bracketed.

## Stage 2 — compare explanations

The resurrection hypothesis is then compared with naturalistic and agnostic alternatives.

The case therefore fails if:

- one of the retained premises is materially weaker than claimed;
- a naturalistic model explains the cluster at lower total cost;
- or the background probability of divine resurrection is too low for the case-specific evidence to overcome.

The formal mapper makes each point of disagreement separately inspectable.
