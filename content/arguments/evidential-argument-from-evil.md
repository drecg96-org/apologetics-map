---
id: evidential-argument-from-evil
title: Evidential argument from evil
type: argument
summary: Severe apparently gratuitous suffering, including natural and animal suffering, is argued to lower the probability of an omnipotent, omniscient, perfectly good God.
topics:
  - existence-of-god
relationships:
  - type: addresses
    target: evidential-problem-of-evil
  - type: depends_on
    target: severe-apparently-gratuitous-suffering-occurs
  - type: depends_on
    target: natural-and-animal-suffering-are-not-explained-by-human-free-will-alone
  - type: depends_on
    target: observed-suffering-may-be-less-expected-on-perfect-theism
  - type: supports
    target: evidential-evil-counts-against-perfect-theism
conversation:
  follows:
    - evidential-problem-of-evil
    - which-hard-objection-should-we-examine
  label: formalize the evidential case
  priority: 10
argument:
  form: abductive
  statements:
    - id: p1
      node: severe-apparently-gratuitous-suffering-occurs
      role: premise
      label: P1
    - id: p2
      node: natural-and-animal-suffering-are-not-explained-by-human-free-will-alone
      role: premise
      label: P2
    - id: p3
      node: observed-suffering-may-be-less-expected-on-perfect-theism
      role: premise
      label: P3
    - id: c1
      node: evidential-evil-counts-against-perfect-theism
      role: conclusion
      label: C
      note: Suffering is evidence against perfect theism to the degree the likelihood comparison succeeds.
  inferences:
    - id: i1
      from:
        - p1
        - p2
        - p3
      to: c1
      kind: abductive
      label: likelihood from suffering
      note: The inference is evidential, not a claim that God and evil are logically inconsistent.
references:
  - source: rowe-problem-of-evil
  - source: draper-pain-and-pleasure
  - source: sep-problem-of-evil
tags:
  - problem-of-evil
  - suffering
  - abduction
status:
  editorial: reviewed
  scholarship: contested
origin:
  kind: agent-research
  github_issues:
    - 62
---

# Argument

M4 treats this as the principal problem of evil.

Plantinga's free-will defense can defeat some versions of the **logical** problem while leaving this probabilistic argument substantially untouched.
