---
id: contingency-argument-for-necessary-ground
title: Contingency argument for a necessary ground
type: argument
summary: Contingent reality is argued to require an ultimate explanation that cannot itself be merely contingent, supporting a necessary explanatory ground.
topics:
  - existence-of-god
relationships:
  - type: addresses
    target: why-is-there-contingent-reality
  - type: depends_on
    target: contingent-reality-exists
  - type: depends_on
    target: contingent-reality-calls-for-ultimate-explanation
  - type: supports
    target: necessary-ground-of-contingent-reality-exists
conversation:
  follows:
    - why-is-there-contingent-reality
  label: make the contingency case
  priority: 10
argument:
  form: abductive
  statements:
    - id: p1
      node: contingent-reality-exists
      role: premise
      label: P1
      note: Begin from concrete contingency rather than from a claim that everything has a cause.
    - id: p2
      node: contingent-reality-calls-for-ultimate-explanation
      role: premise
      label: P2
      note: The disputed explanatory principle says the account should not terminate solely in brute contingent reality.
    - id: c1
      node: necessary-ground-of-contingent-reality-exists
      role: conclusion
      label: C
      note: The immediate conclusion is a necessary ground, not yet the full God of Christianity.
  inferences:
    - id: i1
      from:
        - p1
        - p2
      to: c1
      kind: abductive
      label: ultimate explanation
      note: Infer a non-contingent explanatory ground if brute contingent termination is judged explanatorily inferior.
references:
  - source: sep-cosmological-argument-2026
    note: Current neutral survey of contingency arguments and objections.
  - source: oppy-arguing-about-gods
    note: Skeptical pressure on the explanatory principles and religious conclusion.
tags:
  - contingency
  - cosmological-argument
  - necessary-being
status:
  editorial: reviewed
  scholarship: contested
origin:
  kind: agent-research
  github_issues:
    - 61
---

# Argument

This version avoids the popular but misleading premise **everything has a cause**.

It starts with contingent reality and asks whether brute contingency is an adequate final explanation.

If not, a necessary ground is supported.

## Limit

Nothing in the formal map yet says the necessary ground is personal, good, omnipotent, or Christian.
