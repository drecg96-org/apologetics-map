import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import YAML from "yaml";
import { NodeSchema, type FaithMapNode } from "../schema.js";

const CONTENT_ROOT = path.resolve(process.cwd(), "content");

export type LoadedNode = FaithMapNode & {
  body: string;
  html: string;
  file: string;
};

export type GraphPayload = {
  nodes: Array<Pick<FaithMapNode, "id" | "title" | "type" | "summary" | "topics" | "tags">>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: string;
    label: string;
    note?: string;
  }>;
};

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

function splitMarkdown(text: string, file: string): { frontmatter: unknown; body: string } {
  const normalized = text.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) throw new Error(`${file}: missing frontmatter`);
  const closing = normalized.indexOf("\n---\n", 4);
  if (closing === -1) throw new Error(`${file}: missing closing frontmatter delimiter`);
  return {
    frontmatter: YAML.parse(normalized.slice(4, closing)),
    body: normalized.slice(closing + 5).trim(),
  };
}

export async function loadGraph(): Promise<{ nodes: LoadedNode[]; byId: Map<string, LoadedNode> }> {
  const files = await markdownFiles(CONTENT_ROOT);
  const nodes = await Promise.all(files.map(async (file) => {
    const { frontmatter, body } = splitMarkdown(await readFile(file, "utf8"), file);
    const node = NodeSchema.parse(frontmatter);
    const rendered = marked.parse(body) as string;
    return {
      ...node,
      body,
      html: sanitizeHtml(rendered, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          img: ["src", "alt", "title", "width", "height", "loading"],
        },
      }),
      file: path.relative(process.cwd(), file),
    };
  }));

  nodes.sort((a, b) => a.title.localeCompare(b.title));
  return { nodes, byId: new Map(nodes.map((node) => [node.id, node])) };
}

export function toGraphPayload(nodes: LoadedNode[]): GraphPayload {
  return {
    nodes: nodes.map(({ id, title, type, summary, topics, tags }) => ({
      id, title, type, summary, topics, tags,
    })),
    edges: nodes.flatMap((node) =>
      node.relationships.map((relationship, index) => ({
        id: `${node.id}--${relationship.type}--${relationship.target}--${index}`,
        source: node.id,
        target: relationship.target,
        type: relationship.type,
        label: relationship.type.replaceAll("_", " "),
        note: relationship.note,
      })),
    ),
  };
}
