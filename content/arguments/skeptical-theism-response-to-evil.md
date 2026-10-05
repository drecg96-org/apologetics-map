---
id: skeptical-theism-response-to-evil
title: Skeptical-theism response to evidential evil
type: argument
summary: Human cognitive limitations are used to challenge the inference from our inability to identify a sufficient divine reason for suffering to the probability that no such reason exists.
topics:
  - existence-of-god
relationships:
  - type: addresses
    target: evidential-argument-from-evil
  - type: depends_on
    target: humans-may-be-poorly-positioned-to-survey-all-divine-reasons
  - type: depends_on
    target: no-seeum-inference-from-evil-is-defeasible
conversation:
  follows:
    - can-skeptical-theism-undercut-apparently-gratuitous-evil
  label: make the skeptical-theist reply
  priority: 10
argument:
  form: defeater
  statements:
    - id: p1
      node: humans-may-be-poorly-positioned-to-survey-all-divine-reasons
      role: premise
      label: P1
    - id: p2
      node: no-seeum-inference-from-evil-is-defeasible
      role: premise
      label: P2
    - id: c1
      node: skeptical-theism-undercuts-some-inferences-from-apparent-pointlessness
      role: conclusion
      label: C
  inferences:
    - id: i1
      from:
        - p1
        - p2
      to: c1
      kind: defeater
      label: undercut the no-seeum inference
      note: The response weakens one inference from evil; it does not itself provide a positive explanation of suffering.
references:
  - source: sep-skeptical-theism-2024
tags:
  - skeptical-theism
  - problem-of-evil
status:
  editorial: reviewed
  scholarship: contested
origin:
  kind: agent-research
  github_issues:
    - 62
---

# Argument

This is an **undercutting** response, not a theodicy.

Even if successful, it does not show why God permits a particular horror. It claims only that finite observers should be cautious about inferring that no morally sufficient reason exists.
