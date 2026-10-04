---
id: fine-tuning-argument-for-purposive-source
title: Fine-tuning argument for a purposive cosmic source
type: argument
summary: Life-permitting cosmic conditions are treated as evidence for purposive intelligence if they are substantially more expected on design than under the strongest relevant non-design alternatives.
topics:
  - existence-of-god
relationships:
  - type: addresses
    target: does-fine-tuning-support-design
  - type: depends_on
    target: life-permitting-cosmos-is-sensitive-to-fundamental-parameters
  - type: depends_on
    target: fine-tuning-favors-purposive-explanation
  - type: supports
    target: purposive-cosmic-source-is-supported
conversation:
  follows:
    - does-fine-tuning-support-design
  label: make the fine-tuning case
  priority: 10
argument:
  form: abductive
  statements:
    - id: p1
      node: life-permitting-cosmos-is-sensitive-to-fundamental-parameters
      role: premise
      label: P1
      note: Establish the fine-tuning explanandum without yet inferring design.
    - id: p2
      node: fine-tuning-favors-purposive-explanation
      role: premise
      label: P2
      note: This likelihood comparison bears most of the argumentative weight.
    - id: c1
      node: purposive-cosmic-source-is-supported
      role: conclusion
      label: C
      note: The conclusion is purposive intelligence, not the entire classical or Christian doctrine of God.
  inferences:
    - id: i1
      from:
        - p1
        - p2
      to: c1
      kind: abductive
      label: likelihood comparison
      note: Prefer design only insofar as the observation is better predicted by design after relevant alternatives and selection effects are included.
references:
  - source: iep-design-arguments
    note: Neutral survey of fine-tuning and confirmatory reasoning.
  - source: sep-natural-theology-2026
    note: Scholarly overview of contemporary natural theology.
tags:
  - fine-tuning
  - design
  - abduction
status:
  editorial: reviewed
  scholarship: contested
origin:
  kind: agent-research
  github_issues:
    - 61
---

# Argument

The fine-tuning case is probabilistic, not deductive.

Its crux is not whether life-permitting conditions are interesting. It is whether the observation is **more expected** under a purposive-source hypothesis than under the best rival models.
