---
id: cumulative-natural-theology-case
title: Cumulative natural-theology case for personal theism
type: argument
summary: Partial conclusions from contingency, fine-tuning, consciousness, morality, reason, and religious experience are combined while explicitly discounting overlap and evidential dependence.
topics:
  - existence-of-god
relationships:
  - type: addresses
    target: how-should-natural-theology-arguments-combine
  - type: depends_on
    target: necessary-ground-of-contingent-reality-exists
  - type: depends_on
    target: purposive-cosmic-source-is-supported
  - type: depends_on
    target: fundamental-mental-reality-is-supported
  - type: depends_on
    target: moral-grounding-theism
  - type: depends_on
    target: evolutionary-naturalism-faces-a-cognitive-reliability-challenge
  - type: depends_on
    target: religious-experience-can-provide-defeasible-evidence
  - type: supports
    target: cumulative-natural-theology-supports-personal-theism
conversation:
  follows:
    - how-should-natural-theology-arguments-combine
  label: test the cumulative theistic case
  priority: 10
argument:
  form: cumulative
  statements:
    - id: p1
      node: necessary-ground-of-contingent-reality-exists
      role: premise
      label: P1
    - id: p2
      node: purposive-cosmic-source-is-supported
      role: premise
      label: P2
    - id: p3
      node: fundamental-mental-reality-is-supported
      role: premise
      label: P3
    - id: p4
      node: moral-grounding-theism
      role: premise
      label: P4
    - id: p5
      node: evolutionary-naturalism-faces-a-cognitive-reliability-challenge
      role: premise
      label: P5
    - id: p6
      node: religious-experience-can-provide-defeasible-evidence
      role: premise
      label: P6
    - id: ic1
      node: several-lines-converge-on-a-personal-transcendent-rational-moral-ground
      role: intermediate-conclusion
      label: IC
    - id: p7
      node: natural-theology-lines-are-not-fully-independent
      role: premise
      label: P7
      note: Cumulative force must be discounted for overlap rather than assuming independence.
    - id: p8
      node: cumulative-theism-must-count-counterevidence
      role: premise
      label: P8
      note: The cumulative judgment must include evil, hiddenness, diversity, and other negative evidence.
    - id: c1
      node: cumulative-natural-theology-supports-personal-theism
      role: conclusion
      label: C
  inferences:
    - id: i1
      from:
        - p1
        - p2
        - p3
        - p4
        - p5
        - p6
      to: ic1
      kind: cumulative
      label: property convergence
      note: Ask whether the partial conclusions mutually converge rather than merely counting arguments.
    - id: i2
      from:
        - ic1
        - p7
        - p8
      to: c1
      kind: abductive
      label: dependence-aware synthesis
      note: Support personal theism only if convergence remains positive after accounting for shared assumptions, non-independent evidence, and serious counterevidence.
references:
  - source: sep-natural-theology-2026
    note: Neutral framework for the argument families.
  - source: oppy-arguing-about-gods
    note: Skeptical comparison of major theistic arguments.
tags:
  - cumulative-case
  - theism
  - natural-theology
status:
  editorial: stable
  scholarship: contested
origin:
  kind: agent-research
  github_issues:
    - 61
---

# Argument

This is the central M3 synthesis.

It does not pretend six contested arguments become six independent votes.

The positive claim is that **different successful arguments may converge on different aspects of one worldview hypothesis**, making personal theism a better unified explanation than any line establishes alone.
