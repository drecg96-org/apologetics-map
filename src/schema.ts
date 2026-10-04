import { z } from "zod";

export const NODE_TYPES = [
  "topic", "question", "claim", "argument", "objection",
  "response", "evidence", "source", "doctrine", "worldview",
] as const;

export const RELATIONSHIP_TYPES = [
  "supports", "challenges", "responds_to", "depends_on",
  "qualifies", "contradicts", "related_to", "evidence_for", "addresses",
] as const;

const slug = z.string().regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  "must be a lowercase kebab-case slug",
);

export const RelationshipSchema = z.object({
  type: z.enum(RELATIONSHIP_TYPES),
  target: slug,
  note: z.string().min(1).optional(),
});

export const ReferenceSchema = z.object({
  source: slug,
  locator: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
});

export const NodeSchema = z.object({
  id: slug,
  title: z.string().min(1),
  type: z.enum(NODE_TYPES),
  summary: z.string().min(1).optional(),
  topics: z.array(slug).default([]),
  relationships: z.array(RelationshipSchema).default([]),
  references: z.array(ReferenceSchema).default([]),
  tags: z.array(slug).default([]),
  aliases: z.array(z.string().min(1)).default([]),
  status: z.object({
    editorial: z.enum(["draft", "reviewed", "stable"]).optional(),
    scholarship: z.enum(["unknown", "consensus", "majority", "contested", "minority"]).optional(),
    christian: z.enum(["unknown", "broad-consensus", "tradition-specific", "contested"]).optional(),
  }).optional(),
  source: z.object({
    kind: z.enum([
      "book", "article", "paper", "website", "scripture",
      "primary-source", "video", "debate", "other",
    ]).optional(),
    authors: z.array(z.string().min(1)).optional(),
    year: z.union([z.string().min(1), z.number().int()]).optional(),
    publisher: z.string().min(1).optional(),
    url: z.url().optional(),
  }).optional(),
}).strict();

export type ApologeticsMapNode = z.infer<typeof NodeSchema>;
