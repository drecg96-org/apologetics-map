# Depth, Evidence, and Argument-Mapping Roadmap

This roadmap turns Apologetics Map from a strong graph/navigation shell into a deeper, auditable argument-and-evidence system.

The priority is **depth before breadth**. We should finish representative debate trunks to a high standard, learn what the graph model needs, and only then scale the same standard across more topics.

## Target identity

Apologetics Map should become:

> A version-controlled, source-auditable debate graph where a reader can follow a real conversation, inspect the formal premises and inferences underneath each argument, and drill from conclusions all the way down to evidence, objections, sources, and competing worldview explanations.

This intentionally combines three layers that remain distinct:

1. **Conversation flow** — what someone commonly says next.
2. **Semantic graph** — what supports, challenges, depends on, qualifies, or evidences what.
3. **Formal argument structure** — which propositions function as premises, intermediate conclusions, and conclusions, and how an inference combines them.

## Quality principles

### Atomic propositions

A disputable premise should normally be a reusable `claim` node rather than prose hidden inside an argument. This allows the same proposition to be reused across several arguments and gives evidence/objections one stable target.

### Sources are not evidence

A source node records where information or argumentation comes from. An `evidence` node records the actual proposition or datum that should change confidence in a claim.

The graph should increasingly look like:

`source → evidence → claim/premise → argument → conclusion`

rather than:

`source → argument prose`

### Reception belongs close to the proposition

Broad labels such as `scholarship: contested` remain useful, but important historical or factual debates should be split until reception can be stated meaningfully at the evidence/claim level.

For example, "Jesus was crucified," "the empty tomb is historical," and "God raised Jesus" should not inherit one undifferentiated scholarly-status label.

### Strong objections are first-class

Important skeptical or rival-religion positions should be represented by their strongest recognizable formulations, preferably with direct challenger sources and neutral scholarship where available.

An unresolved branch is valid graph state. We should not manufacture a weak reply merely to make every branch terminate in a Christian conclusion.

### Explicit limits

Every important argument/evidence node should make clear what it establishes and what it does not establish. A successful moral argument does not by itself establish Christianity; a successful resurrection datum does not by itself establish a miracle.

### Gold-standard trunks before broad coverage

A smaller number of deeply mapped branches is more useful than hundreds of shallow headings. New topic breadth should follow the standards learned from the initial deep trunks.

---

# Milestone 0 — Formal argument mapper and quality baseline

**Goal:** Make the logical anatomy of an argument inspectable without replacing the existing debate and semantic graphs.

## Deliverables

- Add optional machine-readable `argument` structure to argument nodes.
- Represent premises/intermediate conclusions/conclusions as references to reusable claim nodes.
- Represent explicit inference steps separately from propositions.
- Validate statement references, local IDs, and inference connectivity.
- Render an interactive argument mapper on argument reference pages.
- Show premise/conclusion status and the number of graph supports/challenges where useful.
- Make every proposition in the mapper clickable into its full claim page.
- Pilot the model on the moral argument.
- Convert at least two structurally different arguments after the pilot:
  - a transcendental argument;
  - a historical/abductive argument.
- Add a graph-health report covering counts by node type, unresolved conversational dead ends, evidence/source ratio, and structured-argument coverage.

## Follow-on requirement: inference challenges

Premises already have stable claim-node targets. Inference steps do not.

After the mapper pilot proves the basic structure, add a narrowly scoped way for an objection/response to address an **inference itself**, not merely one of its premises. Avoid introducing a generic free-form subnode system if a small typed argument-target relationship is sufficient.

## Exit criteria

- At least three arguments use the formal schema.
- The mapper handles multiple premises and at least one intermediate conclusion.
- Invalid statement/inference references fail validation.
- A reader can navigate from an argument to any premise and from that premise to its evidence and objections.
- Formal structure does not duplicate or replace debate-flow relationships.

---

# Milestone 1 — Atomic evidence and scholarly reception

**Goal:** Turn the existing source library into an actual evidence layer.

## Deliverables

- Define an evidence authoring standard:
  - one checkable datum/proposition per evidence node;
  - explicit relevance: what claim it raises/lowers confidence in;
  - explicit limitation: what the evidence does not establish;
  - references to primary and/or strongest scholarly sources;
  - meaningful `scholarship` status where appropriate.
- Add validation/health metrics for:
  - evidence nodes with zero sources;
  - major historical claims with sources but no evidence nodes;
  - source-heavy argument nodes that have not yet been decomposed into evidence.
- Add an evidence-focused UI card that shows:
  - reception/status;
  - why it matters;
  - main challenge;
  - source trail.
- Add a source-integration workflow that proposes evidence nodes before jumping directly from a source to a high-level conclusion.

## First conversion target

Use the resurrection branch as the pilot evidence corpus.

Candidate evidence families include:

- Jesus' existence;
- crucifixion/death;
- burial traditions;
- empty-tomb traditions;
- early resurrection proclamation;
- 1 Corinthians 15 tradition and dating;
- reported appearance experiences;
- Paul;
- James;
- early meaning of "resurrection";
- growth/origin of resurrection belief;
- relevant manuscript/textual questions.

Each should be split only as far as needed for meaningful sourcing and reception labels.

## Exit criteria

- Evidence is no longer the sparsest substantive node type.
- Every major resurrection datum in the pilot has at least one evidence node and source trail.
- Historical consensus labels apply to discrete propositions rather than to the resurrection conclusion as a whole.
- Evidence nodes state both relevance and limits.

---

# Milestone 2 — Gold-standard resurrection and historical-Christianity trunk

**Goal:** Produce one branch deep enough to serve as the model for the rest of the project.

## Scope

Start with:

`What most drives skepticism? → Christianity-specific skepticism → Jesus → crucifixion → resurrection → explanatory alternatives → Christian significance`

The branch should not assume that establishing historical facts automatically licenses a supernatural explanation.

## Required subtrees

- What facts are actually historically supported?
- How early are the relevant sources/traditions?
- What did earliest Christians mean by resurrection?
- Empty tomb:
  - arguments for;
  - arguments against;
  - scholarly reception.
- Appearance claims:
  - who;
  - what is actually reported;
  - what can historians infer?
- Naturalistic/explanatory alternatives:
  - legend;
  - hallucination/vision;
  - cognitive dissonance;
  - mistaken identity;
  - body relocation/theft where seriously defended;
  - mixed/multiple-cause explanations.
- Miracle methodology:
  - Humean/evidential burden;
  - methodological naturalism;
  - Bayesian/inference-to-best-explanation approaches;
  - prior probability and background theism.
- What follows if resurrection is accepted?
- What does not yet follow?

## Argument-mapper usage

Formalize at least:

- one "minimal facts" style argument;
- one broader abductive resurrection argument;
- one skeptical counter-argument or alternative explanation.

This keeps the mapper symmetrical rather than making formal structure a feature only for Christian arguments.

## Exit criteria

- A skeptic can traverse the branch without being forced into a Christian premise.
- Major naturalistic alternatives have dedicated sourced nodes.
- Major historical data are atomic evidence nodes.
- Christian inference and historical method are separate debate stages.
- The branch has no accidental dead ends; unresolved endpoints are explicitly labeled.

---

# Milestone 3 — Cumulative case: skepticism → God → Christianity

**Goal:** Make the large-scale route visible without pretending any one argument proves the entire worldview.

## Main trunks

Deepen or add:

- contingency/cosmological arguments;
- beginning of the universe where philosophically relevant;
- fine-tuning/design;
- consciousness/mind;
- reason and reliability of cognition;
- moral realism and moral grounding;
- transcendental arguments;
- religious experience where appropriate;
- divine attributes and what kind of God follows.

## Bridge discipline

Every argument should identify its actual conclusion.

Examples:

- contingency may support a necessary foundation;
- fine-tuning may support purposive explanation;
- moral argument may support a necessarily good personal ground;
- TAG may attempt a much stronger worldview conclusion and therefore bears a much heavier comparative burden.

Then add explicit synthesis/cumulative nodes asking what follows when several partially independent lines are considered together.

## Christianity bridge

The transition should be represented explicitly:

`generic theism / classical theism → revelation possible? → competing revelation claims → historical Jesus → resurrection → Christian-specific claims`

Do not make "God exists" silently equal "Christianity is true."

## Exit criteria

- The homepage/debate explorer exposes a coherent high-level path from skepticism through theism to Christian-specific investigation.
- Major arguments have formal maps.
- Each argument exposes its strongest live alternatives.
- The cumulative node states where evidential independence/dependence between arguments matters.

---

# Milestone 4 — Hard-objection suite

**Goal:** Make the project's strongest critical material at least as developed as its affirmative case.

The newly added sin/atonement/Fall/divine-power branch provides a starting skeleton.

## Core clusters

### Evil and suffering

- logical problem of evil;
- evidential problem of evil;
- horrendous suffering;
- natural evil;
- animal suffering;
- pre-human suffering;
- free-will defense and its limits;
- soul-making;
- skeptical theism and objections to skeptical theism;
- heaven and the "free creatures who never sin" challenge.

### Divine hiddenness

- nonresistant nonbelief;
- freedom/coercion replies;
- relationship/soul-making replies;
- why greater evidence need not compel love;
- demographic/religious-distribution concerns;
- reasonable unbelief.

### Fall, omnipotence, and creation

- why make a fall possible?
- could God create free creatures who always freely do good?
- what omnipotence does and does not mean;
- divine foreknowledge and freedom;
- natural suffering and the Fall.

### Sin, forgiveness, atonement, and salvation

- why can God not simply forgive?
- justice vs mercy;
- major atonement models rather than one assumed theory;
- why the cross?
- substitution objections;
- universal salvation / why not save everyone by default?
- hell as judgment vs self-exclusion;
- proportionality and eternal punishment;
- culpable/nonculpable unbelief.

## Exit criteria

- Free will is never presented as a complete answer to the evidential problem of evil.
- Tradition-specific Christian answers are labeled as such.
- Major atonement/hell views are distinguished rather than collapsed.
- Skeptical pressure remains visible after each response.

---

# Milestone 5 — Christianity, Judaism, Islam, and competing revelation

**Goal:** Make "why Christianity?" a genuinely comparative branch rather than a Christian answer followed by brief notes about other religions.

## Shared comparison axes

- identity of Jesus;
- Messiah expectations;
- crucifixion;
- resurrection;
- divinity of Jesus;
- Trinity and monotheism;
- covenant continuity/fulfillment;
- revelation and prophecy;
- textual transmission;
- later-revelation claims;
- criteria for correcting earlier revelation;
- internal coherence;
- historical proximity to disputed events.

## Source rules

For disputed claims, use:

1. primary texts from the tradition;
2. informed representatives of that tradition;
3. neutral/historical scholarship where applicable;
4. opposing scholarship/criticism.

Do not source Islam mainly through Christian apologists or Judaism mainly through Christian readings of Jewish texts.

## Exit criteria

- Judaism and Islam have their own internally recognizable claims and objections.
- The resurrection/crucifixion disagreement with Islam connects directly into the historical evidence branch rather than duplicating it.
- Christian fulfillment arguments expose Jewish objections at the relevant textual premises.
- Trinity debates distinguish logical coherence from whether Scripture/revelation actually teaches the doctrine.

---

# Milestone 6 — Cruxes, question routing, and discovery

**Goal:** Help a reader reach the right debate node from an ordinary-language question and understand what would actually move the dispute.

## Crux model

Introduce a lightweight crux concept for important disputes:

> Which proposition, observation, or methodological choice would most change the downstream conclusion if resolved differently?

Examples:

- hiddenness: whether greater noncoercive evidence would frustrate goods sufficient to justify nonresistant nonbelief;
- resurrection: whether supernatural explanations may enter the explanatory comparison and how prior probability should be set;
- moral argument: whether impersonal normative facts can explain authoritative obligation without explanatory loss.

Cruxes should be descriptive, not numerical certainty scores.

## Discovery

- Improve search across titles, aliases, summaries, body text, sources, and argument premises.
- Add natural-language-style question routing using deterministic matching first.
- Show "best starting node" plus related alternatives.
- Preserve direct/shareable URLs.
- Add curated entry paths for common questions.

An LLM-assisted router can be considered later, but canonical answers must continue to come from graph content rather than generated hidden knowledge.

## Exit criteria

- Common questions such as "Why did God need the cross?" or "What about a good atheist?" land on useful starting nodes.
- Important disputes display a meaningful crux where one can be stated responsibly.
- Search does not require knowing the map's exact terminology.

---

# Milestone 7 — Breadth expansion and practice

**Goal:** Expand only after the core standards are proven.

## Breadth candidates

- Scripture reliability, canon, authorship, transmission, contradictions;
- prophecy and Old Testament interpretation;
- archaeology/history;
- science and faith;
- creation/evolution;
- consciousness and physicalism;
- miracles beyond the resurrection;
- prayer;
- other major religious/worldview families beyond Judaism and Islam.

## Practice mode

Add a graph-grounded practice system only after the content is sufficiently deep.

Possible workflow:

1. choose a debate branch;
2. choose which side to practice;
3. system presents a mapped opposing move;
4. user responds;
5. feedback is based on the canonical argument/evidence graph;
6. show missed premises, objections, distinctions, or evidence;
7. allow opening the exact nodes used for evaluation.

The practice layer should not become an unsourced generic apologetics chatbot.

## Exit criteria

- New topic families use the same atomic evidence and formal-argument standards.
- Practice exercises link every substantive correction back to canonical graph nodes.
- Breadth growth does not materially reduce source quality or skeptical representation.

---

# Ongoing graph-health metrics

Add these to `npm run graph -- stats` or a dedicated health command over time:

- substantive node counts by type/topic;
- evidence nodes per major factual/historical claim;
- source-to-evidence and source-to-claim integration ratios;
- argument nodes with formal structure;
- premise claims with zero support or zero challenge;
- unresolved conversational endpoints;
- accidental dead ends;
- draft/reviewed/stable distribution;
- scholarship-status distribution;
- Christian-status distribution;
- direct skeptical/rival-tradition source coverage on objection nodes;
- Scripture coverage for explicitly Christian claims;
- orphaned nodes;
- unusually source-heavy nodes that may need atomization.

These are maintenance signals, not truth scores.

# Working order

The default implementation order is:

1. Finish Milestone 0 and validate the mapper model.
2. Build Milestone 1 around resurrection evidence.
3. Complete Milestone 2 as the first gold-standard deep branch.
4. Use those lessons for Milestones 3–5.
5. Improve discovery in Milestone 6 after the graph contains enough high-quality destinations.
6. Expand breadth and practice in Milestone 7.

Do not run several content milestones breadth-first in parallel unless the shared schema and quality rules are already stable.
