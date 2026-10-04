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

export const ScriptureReferenceSchema = z.object({
  reference: z.string().min(1),
  note: z.string().min(1).optional(),
});

export const ConversationSchema = z.object({
  follows: z.array(slug).default([]),
  opening: z.boolean().optional(),
  label: z.string().min(1).optional(),
  priority: z.number().int().min(0).optional(),
  terminal: z.object({
    kind: z.enum(["accepted-commitment", "concession", "unresolved"]),
    label: z.string().min(1).optional(),
    note: z.string().min(1).optional(),
  }).optional(),
});

export const ARGUMENT_FORMS = [
  "deductive", "inductive", "abductive", "transcendental",
  "cumulative", "analogical", "other",
] as const;

export const ArgumentStatementSchema = z.object({
  id: slug,
  node: slug,
  role: z.enum(["premise", "intermediate-conclusion", "conclusion"]),
  label: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
}).strict();

export const ArgumentInferenceSchema = z.object({
  id: slug,
  from: z.array(slug).min(1),
  to: slug,
  kind: z.enum(ARGUMENT_FORMS),
  label: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
}).strict();

export const ArgumentStructureSchema = z.object({
  form: z.enum(ARGUMENT_FORMS),
  statements: z.array(ArgumentStatementSchema).min(2),
  inferences: z.array(ArgumentInferenceSchema).min(1),
}).strict();

export const SourceProcessingSchema = z.object({
  discovered: z.boolean().default(true),
  indexed: z.boolean().default(false),
  summarized: z.boolean().default(false),
  reviewed: z.boolean().default(false),
  summary_version: z.number().int().min(1).optional(),
  discovery: z.object({
    provider: z.enum(["web", "openalex", "crossref", "rss", "youtube", "manual", "other"]),
    query: z.string().min(1).optional(),
    retrieved_at: z.string().min(1).optional(),
    external_id: z.string().min(1).optional(),
  }).strict().optional(),
}).strict();

export const OriginSchema = z.object({
  kind: z.enum(["authored", "user-feedback", "source-integration", "agent-research"]),
  github_issues: z.array(z.number().int().positive()).default([]),
  note: z.string().min(1).optional(),
}).strict();

export const NodeSchema = z.object({
  id: slug,
  title: z.string().min(1),
  type: z.enum(NODE_TYPES),
  summary: z.string().min(1).optional(),
  topics: z.array(slug).default([]),
  relationships: z.array(RelationshipSchema).default([]),
  conversation: ConversationSchema.optional(),
  argument: ArgumentStructureSchema.optional(),
  references: z.array(ReferenceSchema).default([]),
  scripture: z.array(ScriptureReferenceSchema).default([]),
  tags: z.array(slug).default([]),
  aliases: z.array(z.string().min(1)).default([]),
  origin: OriginSchema.optional(),
  status: z.object({
    editorial: z.enum(["draft", "reviewed", "stable"]).optional(),
    scholarship: z.enum(["unknown", "consensus", "majority", "contested", "minority"]).optional(),
    christian: z.enum(["unknown", "broad-consensus", "tradition-specific", "contested"]).optional(),
  }).optional(),
  processing: SourceProcessingSchema.optional(),
  source: z.object({
    kind: z.enum([
      "book", "article", "paper", "website", "scripture",
      "primary-source", "video", "debate", "other",
    ]).optional(),
    authors: z.array(z.string().min(1)).optional(),
    year: z.union([z.string().min(1), z.number().int()]).optional(),
    publisher: z.string().min(1).optional(),
    url: z.url().optional(),
    role: z.enum(["primer", "defense", "objection", "debate", "scholarship", "context", "reference"]).optional(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    stance: z.enum(["supports", "challenges", "mixed", "neutral"]).optional(),
    identifiers: z.object({
      doi: z.string().min(1).optional(),
      isbn: z.string().min(1).optional(),
      openalex: z.string().min(1).optional(),
    }).strict().optional(),
  }).optional(),
}).strict();

export type ApologeticsMapNode = z.infer<typeof NodeSchema>;
