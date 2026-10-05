---
id: divine-hiddenness-argument
title: Argument from divine hiddenness
type: argument
summary: Perfect divine love, the apparent existence of nonresistant nonbelief, and the epistemic requirements of conscious relationship are combined to argue that hiddenness is evidence against a perfectly loving God.
topics:
  - existence-of-god
relationships:
  - type: addresses
    target: why-would-a-loving-god-permit-nonresistant-nonbelief
  - type: depends_on
    target: perfect-love-supports-openness-to-relationship
  - type: depends_on
    target: nonresistant-nonbelief-apparently-occurs
  - type: depends_on
    target: conscious-relationship-normally-requires-belief-the-other-exists
conversation:
  follows:
    - why-would-a-loving-god-permit-nonresistant-nonbelief
    - which-hard-objection-should-we-examine
  label: formalize the hiddenness argument
  priority: 10
argument:
  form: abductive
  statements:
    - id: p1
      node: perfect-love-supports-openness-to-relationship
      role: premise
      label: P1
    - id: p2
      node: nonresistant-nonbelief-apparently-occurs
      role: premise
      label: P2
    - id: p3
      node: conscious-relationship-normally-requires-belief-the-other-exists
      role: premise
      label: P3
    - id: c1
      node: divine-hiddenness-is-evidence-against-perfectly-loving-theism
      role: conclusion
      label: C
  inferences:
    - id: i1
      from:
        - p1
        - p2
        - p3
      to: c1
      kind: abductive
      label: relational expectation
      note: Nonresistant nonbelief counts against perfectly loving theism to the extent perfect love predicts available relationship.
references:
  - source: schellenberg-hiddenness-argument
  - source: sep-divine-hiddenness
  - source: blanton-nonresistant-nonbelief-pervasive
tags:
  - divine-hiddenness
  - nonresistant-nonbelief
status:
  editorial: reviewed
  scholarship: contested
origin:
  kind: agent-research
  github_issues:
    - 62
---

# Argument

This is stronger than asking why God is not obvious to everyone.

It focuses on persons who would welcome relationship if convinced.
