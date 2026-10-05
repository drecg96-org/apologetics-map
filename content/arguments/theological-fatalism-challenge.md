---
id: theological-fatalism-challenge
title: Theological fatalism challenge
type: argument
summary: Infallible divine foreknowledge plus the apparent fixity of the past is used to argue that future human actions cannot be otherwise and therefore threaten libertarian freedom.
topics:
  - existence-of-god
relationships:
  - type: depends_on
    target: infallible-foreknowledge-creates-a-theological-fatalism-problem
conversation:
  follows:
    - is-divine-foreknowledge-compatible-with-free-will
  label: formalize theological fatalism
  priority: 10
argument:
  form: deductive
  statements:
    - id: p1
      node: infallible-foreknowledge-creates-a-theological-fatalism-problem
      role: premise
      label: P1
    - id: c1
      node: libertarian-freedom-and-exhaustive-foreknowledge-require-a-compatibility-account
      role: conclusion
      label: C
  inferences:
    - id: i1
      from:
        - p1
      to: c1
      kind: deductive
      label: modal pressure
      note: The map preserves the problem without pretending the controversial modal premises have no replies.
references:
  - source: sep-foreknowledge-free-will-2026
tags:
  - foreknowledge
  - free-will
  - fatalism
status:
  editorial: reviewed
  scholarship: contested
origin:
  kind: agent-research
  github_issues:
    - 62
---

# Argument

M4 does not pick one Christian solution.

It makes the compatibility burden explicit so later appeals to free will do not ignore divine foreknowledge.
