import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { NodeSchema, type ApologeticsMapNode } from "../src/schema.js";
import { parseScriptureReference, scriptureStats } from "../src/lib/scripture.js";

const CONTENT_ROOT = path.resolve("content");
const SCRIPTURE_REQUIRED_TYPES = new Set(["claim", "argument", "response", "doctrine"]);

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

    for (const scripture of item.node.scripture) {
      if (!parseScriptureReference(scripture.reference)) {
        errors.push(`${item.file}: invalid Scripture reference "${scripture.reference}"`);
      }
    }

    const christianStatus = item.node.status?.christian;
    if (
      SCRIPTURE_REQUIRED_TYPES.has(item.node.type)
      && christianStatus
      && christianStatus !== "unknown"
      && item.node.scripture.length === 0
    ) {
      errors.push(
        `${item.file}: ${item.node.type} with status.christian=${christianStatus} must include at least one Scripture reference`,
      );
    }

    if (item.node.argument) {
      if (item.node.type !== "argument") {
        errors.push(`${item.file}: argument structure is only valid on argument nodes`);
      }

      const statementIds = new Set<string>();
      for (const statement of item.node.argument.statements) {
        if (statementIds.has(statement.id)) {
          errors.push(`${item.file}: duplicate argument statement id "${statement.id}"`);
        }
        statementIds.add(statement.id);

        const statementNode = byId.get(statement.node);
        if (!statementNode) {
          errors.push(`${item.file}: argument statement "${statement.id}" points to unknown node "${statement.node}"`);
        } else if (statementNode.node.type !== "claim") {
          errors.push(`${item.file}: argument statement "${statement.id}" must point to a claim node, not "${statementNode.node.type}"`);
        }
      }

      const premiseCount = item.node.argument.statements.filter((statement) => statement.role === "premise").length;
      const conclusionCount = item.node.argument.statements.filter((statement) => statement.role === "conclusion").length;
      if (premiseCount === 0) errors.push(`${item.file}: argument structure must contain at least one premise`);
      if (conclusionCount === 0) errors.push(`${item.file}: argument structure must contain at least one conclusion`);

      const inferenceIds = new Set<string>();
      const targetedStatements = new Set<string>();
      const usedStatements = new Set<string>();
      for (const inference of item.node.argument.inferences) {
        if (inferenceIds.has(inference.id)) {
          errors.push(`${item.file}: duplicate argument inference id "${inference.id}"`);
        }
        inferenceIds.add(inference.id);

        for (const sourceId of inference.from) {
          usedStatements.add(sourceId);
          if (!statementIds.has(sourceId)) {
            errors.push(`${item.file}: inference "${inference.id}" uses unknown statement "${sourceId}"`);
          }
        }
        targetedStatements.add(inference.to);
        usedStatements.add(inference.to);
        if (!statementIds.has(inference.to)) {
          errors.push(`${item.file}: inference "${inference.id}" targets unknown statement "${inference.to}"`);
        }
        if (inference.from.includes(inference.to)) {
          errors.push(`${item.file}: inference "${inference.id}" cannot use its target as a source`);
        }
      }

      for (const statement of item.node.argument.statements) {
        if (!usedStatements.has(statement.id)) {
          errors.push(`${item.file}: argument statement "${statement.id}" is not connected to any inference`);
        }
        if (statement.role !== "premise" && !targetedStatements.has(statement.id)) {
          errors.push(`${item.file}: ${statement.role} "${statement.id}" must be produced by an inference`);
        }
      }
    }

    if (item.node.inference_challenges.length > 0) {
      if (item.node.type !== "objection") {
        errors.push(`${item.file}: inference_challenges are only valid on objection nodes`);
      }
      for (const challenge of item.node.inference_challenges) {
        const argumentNode = byId.get(challenge.argument);
        if (!argumentNode) {
          errors.push(`${item.file}: inference challenge points to unknown argument "${challenge.argument}"`);
          continue;
        }
        if (argumentNode.node.type !== "argument") {
          errors.push(`${item.file}: inference challenge target "${challenge.argument}" is not an argument node`);
          continue;
        }
        if (!argumentNode.node.argument) {
          errors.push(`${item.file}: inference challenge target "${challenge.argument}" has no formal argument structure`);
          continue;
        }
        if (!argumentNode.node.argument.inferences.some((inference) => inference.id === challenge.inference)) {
          errors.push(`${item.file}: inference challenge targets unknown inference "${challenge.inference}" on "${challenge.argument}"`);
        }
      }
    }

    if (item.node.processing && item.node.type !== "source") {
      errors.push(`${item.file}: processing metadata is only valid on source nodes`);
    }
    if (item.node.processing?.summarized && !item.node.summary) {
      errors.push(`${item.file}: processing.summarized=true requires a summary`);
    }
  }

  if (files.length === 0) errors.push("content/: no graph nodes found");

  const scripture = await scriptureStats().catch((error) => {
    errors.push(`data/scripture/web: unable to load corpus — ${error instanceof Error ? error.message : String(error)}`);
    return null;
  });
  if (scripture && (scripture.books !== 66 || scripture.chapters !== 1189 || scripture.verses < 31000)) {
    errors.push(`data/scripture/web: expected full 66-book canon, found ${scripture.books} books / ${scripture.chapters} chapters / ${scripture.verses} verses`);
  }

  if (errors.length > 0) {
    console.error("\nApologetics Map validation failed:\n");
    for (const error of errors) console.error(`- ${error}`);
    console.error("");
    process.exit(1);
  }

  const edgeCount = loaded.reduce((total, item) => total + item.node.relationships.length, 0);
  console.log(`Apologetics Map valid: ${loaded.length} nodes, ${edgeCount} explicit relationships, ${scripture?.verses ?? 0} WEB verses.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
