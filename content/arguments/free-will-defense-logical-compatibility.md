---
id: free-will-defense-logical-compatibility
title: Free-will defense of logical compatibility
type: argument
summary: The value of morally significant freedom and the distinction between logical possibility and feasible free-creature worlds are used to defend the logical compatibility of God and some moral evil.
topics:
  - existence-of-god
relationships:
  - type: depends_on
    target: morally-significant-freedom-can-explain-some-moral-evil
  - type: depends_on
    target: not-every-logically-describable-free-creature-world-must-be-feasible-for-god
  - type: supports
    target: creating-free-agents-need-not-mean-god-ceases-to-be-omnipotent
conversation:
  follows:
    - why-did-god-make-the-fall-possible
    - god-could-have-created-free-creatures-who-never-sin
  label: test the free-will defense
  priority: 10
argument:
  form: modal
  statements:
    - id: p1
      node: morally-significant-freedom-can-explain-some-moral-evil
      role: premise
      label: P1
    - id: p2
      node: not-every-logically-describable-free-creature-world-must-be-feasible-for-god
      role: premise
      label: P2
    - id: c1
      node: creating-free-agents-need-not-mean-god-ceases-to-be-omnipotent
      role: conclusion
      label: C
  inferences:
    - id: i1
      from:
        - p1
        - p2
      to: c1
      kind: deductive
      label: logical compatibility
      note: This is a defense against inconsistency, not a complete explanation of observed suffering.
references:
  - source: plantinga-free-will-defense
  - source: sep-problem-of-evil
  - source: sep-omnipotence
tags:
  - free-will
  - logical-problem-of-evil
status:
  editorial: reviewed
  scholarship: contested
origin:
  kind: agent-research
  github_issues:
    - 62
---

# Argument

The target is intentionally narrow.

If this argument succeeds, it blocks the claim that **God and any moral evil are logically incompatible**.

It does not resolve the evidential problem, natural evil, animal suffering, or the scale of horrors.
