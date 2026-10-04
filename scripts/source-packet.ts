import { loadGraph } from "../src/lib/graph.js";
import { findScriptureReferences, lookupScriptureReference } from "../src/lib/scripture.js";

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("Usage: npm run sources:packet -- <source-id>");
    process.exit(1);
  }

  const { nodes, byId } = await loadGraph();
  const source = byId.get(id);
  if (!source || source.type !== "source") {
    console.error(`Unknown source node: ${id}`);
    process.exit(1);
  }

  const referencedBy = nodes
    .filter((node) => node.references.some((reference) => reference.source === source.id))
    .map((node) => ({ id: node.id, title: node.title, type: node.type, summary: node.summary }));

  const topicSet = new Set(source.topics);
  const neighborhood = nodes
    .filter((node) => node.type !== "source" && node.topics.some((topic) => topicSet.has(topic)))
    .map((node) => ({
      id: node.id,
      title: node.title,
      type: node.type,
      summary: node.summary,
      relationships: node.relationships,
      conversation: node.conversation,
      references: node.references,
      scripture: node.scripture,
    }));

  const detectedScripture = findScriptureReferences([source.summary, source.body].filter(Boolean).join("\n")).slice(0, 10);
  const explicitScripture = source.scripture.map((item) => item.reference);
  const scriptureRefs = [...new Set([...explicitScripture, ...detectedScripture])].slice(0, 10);
  const scriptureContext = (await Promise.all(scriptureRefs.map(async (reference) => {
    const lookup = await lookupScriptureReference(reference);
    if (!lookup) return null;
    return {
      reference: lookup.canonical,
      web: lookup.verses.slice(0, 12),
      youVersionEsvUrl: lookup.youVersionEsvUrl,
      truncated: lookup.verses.length > 12,
    };
  }))).filter(Boolean);

  console.log(JSON.stringify({
    task: "Summarize this source from the original URL, then propose minimal evidence-backed graph integrations. Do not treat the source summary as an authority independent of the source.",
    source: {
      id: source.id,
      title: source.title,
      metadata: source.source,
      processing: source.processing,
      currentSummary: source.summary,
      currentBody: source.body,
    },
    currentIntegration: referencedBy,
    scriptureContext,
    graphNeighborhood: neighborhood,
    outputContract: {
      sourceChanges: [
        "concise neutral summary",
        "key claims and limitations",
        "processing.summarized=true",
        "summary_version increment",
      ],
      graphChanges: [
        "references with useful locators/notes",
        "for checkable historical/factual/textual/scientific data, prefer source → evidence node → claim rather than citing a high-level conclusion directly",
        "evidence nodes should state one datum, use evidence_for, declare scholarly reception, explain relevance, and state limits",
        "only create new claim/objection/response nodes when the source exposes a genuine graph gap",
        "preserve distinction between advocacy, scholarship, and primary evidence",
        "for specifically Christian claim/argument/response/doctrine nodes, set status.christian and record relevant Bible passages in the scripture field",
        "inspect the local WEB passage before citing it; use Scripture as direct grounding for doctrine and as clearly labeled worldview grounding for public philosophical arguments",
      ],
      review: "Leave processing.reviewed=false until human review.",
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
