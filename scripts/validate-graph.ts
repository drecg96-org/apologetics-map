import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { NodeSchema, type ApologeticsMapNode } from "../src/schema.js";

const CONTENT_ROOT = path.resolve("content");

type LoadedNode = { file: string; node: ApologeticsMapNode };

async function markdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    if (entry.isFile() && entry.name.endsWith(".md") && entry.name.toLowerCase() !== "readme.md") return [full];
    return [];
  }));
  return nested.flat();
}

function parseFrontmatter(text: string, file: string): unknown {
  const normalized = text.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) throw new Error(`${file}: missing YAML frontmatter opening delimiter`);
  const closing = normalized.indexOf("\n---\n", 4);
  if (closing === -1) throw new Error(`${file}: missing YAML frontmatter closing delimiter`);
  return YAML.parse(normalized.slice(4, closing));
}

async function main() {
  const files = await markdownFiles(CONTENT_ROOT);
  const errors: string[] = [];
  const loaded: LoadedNode[] = [];

  for (const file of files) {
    try {
      const raw = parseFrontmatter(await readFile(file, "utf8"), file);
      const parsed = NodeSchema.safeParse(raw);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          errors.push(`${file}: ${issue.path.join(".") || "frontmatter"} — ${issue.message}`);
        }
        continue;
      }
      const expectedFilename = `${parsed.data.id}.md`;
      if (path.basename(file) !== expectedFilename) {
        errors.push(`${file}: filename must match node id (${expectedFilename})`);
      }
      loaded.push({ file, node: parsed.data });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const byId = new Map<string, LoadedNode>();
  for (const item of loaded) {
    const previous = byId.get(item.node.id);
    if (previous) {
      errors.push(`duplicate id "${item.node.id}" in ${previous.file} and ${item.file}`);
    } else {
      byId.set(item.node.id, item);
    }
  }

  for (const item of loaded) {
    for (const topicId of item.node.topics) {
      const topic = byId.get(topicId);
      if (!topic) errors.push(`${item.file}: unknown topic "${topicId}"`);
      else if (topic.node.type !== "topic") {
        errors.push(`${item.file}: topics entry "${topicId}" resolves to type "${topic.node.type}", not "topic"`);
      }
    }

    for (const relation of item.node.relationships) {
      if (!byId.has(relation.target)) {
        errors.push(`${item.file}: relationship "${relation.type}" points to unknown node "${relation.target}"`);
      }
      if (relation.target === item.node.id && relation.type !== "related_to") {
        errors.push(`${item.file}: relationship "${relation.type}" cannot target itself`);
      }
    }

    for (const previousId of item.node.conversation?.follows ?? []) {
      if (!byId.has(previousId)) {
        errors.push(`${item.file}: conversation follows unknown node "${previousId}"`);
      }
      if (previousId === item.node.id) {
        errors.push(`${item.file}: conversation cannot follow itself`);
      }
    }

    for (const reference of item.node.references) {
      const source = byId.get(reference.source);
      if (!source) errors.push(`${item.file}: reference points to unknown source "${reference.source}"`);
      else if (source.node.type !== "source") {
        errors.push(`${item.file}: reference "${reference.source}" resolves to type "${source.node.type}", not "source"`);
      }
    }
  }

  if (files.length === 0) errors.push("content/: no graph nodes found");

  if (errors.length > 0) {
    console.error("\nApologetics Map validation failed:\n");
    for (const error of errors) console.error(`- ${error}`);
    console.error("");
    process.exit(1);
  }

  const edgeCount = loaded.reduce((total, item) => total + item.node.relationships.length, 0);
  console.log(`Apologetics Map valid: ${loaded.length} nodes, ${edgeCount} explicit relationships.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
