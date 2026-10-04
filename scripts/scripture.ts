import { readFile } from "node:fs/promises";
import { findScriptureReferences, lookupScriptureReference, scriptureStats } from "../src/lib/scripture.js";

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  if (command === "stats") {
    console.log(JSON.stringify(await scriptureStats(), null, 2));
    return;
  }

  if (command === "lookup") {
    const reference = rest.join(" ").trim();
    if (!reference) throw new Error("Usage: npm run scripture:lookup -- Romans 2:14-15");
    const result = await lookupScriptureReference(reference);
    if (!result) throw new Error(`Invalid or unavailable Scripture reference: ${reference}`);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "scan") {
    const file = rest[0];
    if (!file) throw new Error("Usage: npm run scripture:scan -- path/to/file.md");
    const text = await readFile(file, "utf8");
    const references = findScriptureReferences(text);
    const lookups = await Promise.all(references.map((reference) => lookupScriptureReference(reference)));
    console.log(JSON.stringify(lookups.filter(Boolean), null, 2));
    return;
  }

  throw new Error("Usage: scripture.ts <stats | lookup | scan>");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
