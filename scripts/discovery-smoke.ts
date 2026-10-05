import { rankDiscoveryResults } from "../src/lib/discovery.js";
import { loadGraph, toGraphPayload } from "../src/lib/graph.js";

const cases = [
  ["why does God allow suffering", "evidential-problem-of-evil"],
  ["why is God hidden", "why-would-a-loving-god-permit-nonresistant-nonbelief"],
  ["did Jesus really rise from the dead", "did-jesus-rise-from-the-dead"],
  ["why Christianity instead of Islam", "why-christianity-rather-than-judaism-or-islam"],
  ["is Jesus God", "is-jesus-divine-and-is-the-trinity-monotheistic"],
  ["was the Bible corrupted", "how-do-biblical-and-quranic-textual-transmission-compare"],
  ["why did Jesus have to die", "why-did-an-omnipotent-god-require-the-cross"],
  ["why doesnt God save everyone", "why-not-save-everyone-by-default"],
  ["what grounds logic and reason", "what-makes-rational-thought-possible"],
  ["what caused the universe", "does-cosmic-beginning-point-to-a-cause"],
] as const;

const { nodes } = await loadGraph();
const graph = toGraphPayload(nodes);

const failures: string[] = [];
for (const [query, expected] of cases) {
  const results = rankDiscoveryResults(graph, query, 3);
  if (!results.some((result) => result.id === expected)) {
    failures.push(
      `${JSON.stringify(query)} expected ${expected} in top 3; got ${results.map((result) => result.id).join(", ") || "no results"}`,
    );
  }
}

if (failures.length > 0) {
  console.error("Discovery smoke test failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log(`Discovery smoke test passed: ${cases.length} common-language questions routed successfully.`);
