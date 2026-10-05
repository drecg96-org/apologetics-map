---
id: atonement-necessity-challenge
title: Challenge to the strict necessity of sacrificial atonement
type: argument
summary: Divine sovereignty, the apparent possibility of unilateral forgiveness, and diversity among Christian atonement models are used to challenge the claim that suffering or payment was strictly required before God could forgive.
topics:
  - sin-atonement-and-divine-power
relationships:
  - type: addresses
    target: god-could-forgive-without-sacrifice
  - type: depends_on
    target: christian-atonement-models-make-different-necessity-claims
  - type: depends_on
    target: strict-logical-necessity-of-cross-is-stronger-than-most-models-require
conversation:
  follows:
    - god-could-forgive-without-sacrifice
    - what-must-atonement-accomplish
  label: formalize the necessity challenge
  priority: 10
argument:
  form: abductive
  statements:
    - id: p1
      node: christian-atonement-models-make-different-necessity-claims
      role: premise
      label: P1
    - id: p2
      node: strict-logical-necessity-of-cross-is-stronger-than-most-models-require
      role: premise
      label: P2
    - id: c1
      node: atonement-need-not-be-understood-as-external-constraint-on-god
      role: conclusion
      label: C
  inferences:
    - id: i1
      from:
        - p1
        - p2
      to: c1
      kind: abductive
      label: distinguish necessity claims
references:
  - source: sep-atonement
  - source: sep-omnipotence
tags:
  - atonement
  - omnipotence
status:
  editorial: reviewed
  scholarship: contested
origin:
  kind: agent-research
  github_issues:
    - 62
---

# Argument

This argument does **not** prove any atonement theory.

It removes an avoidable picture in which God is trapped by an external rule and only becomes capable of mercy after someone suffers.
