import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

type SourceKind = "book" | "article" | "paper" | "website" | "video" | "debate" | "other";
type Candidate = {
  id?: string;
  title: string;
  topic: string;
  url: string;
  kind: SourceKind;
  authors?: string[];
  year?: string | number;
  publisher?: string;
  role?: "primer" | "defense" | "objection" | "debate" | "scholarship" | "context" | "reference";
  difficulty?: "beginner" | "intermediate" | "advanced";
  stance?: "supports" | "challenges" | "mixed" | "neutral";
  tags?: string[];
  doi?: string;
  openalex?: string;
  provider: "web" | "openalex" | "crossref";
  query?: string;
  externalId?: string;
  indexed: boolean;
};

type QueryTarget = {
  topic: string;
  query: string;
  required_any?: string[];
};
type WebSeed = Omit<Candidate, "provider" | "indexed" | "externalId">;

type HarvestConfig = {
  max_new_sources?: number;
  providers?: {
    web?: { enabled?: boolean; seeds?: WebSeed[] };
    openalex?: { enabled?: boolean; per_query?: number; queries?: QueryTarget[] };
    crossref?: { enabled?: boolean; per_query?: number; queries?: QueryTarget[] };
  };
};

const SOURCE_ROOT = path.resolve("content/sources");
const HARVEST_ROOT = path.join(SOURCE_ROOT, "harvested");
const CONFIG_FILE = path.resolve("config/source-harvest.yml");
const USER_AGENT = "apologetics-map-source-harvester/0.2 (+https://github.com/drecg96-org/apologetics-map)";
const dryRun = process.argv.includes("--dry-run");

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function canonicalDoi(value?: string) {
  return value?.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "").trim().toLowerCase() || undefined;
}

function idFor(candidate: Candidate) {
  if (candidate.id) return candidate.id;
  const fingerprint = candidate.doi ?? candidate.externalId ?? candidate.url;
  const suffix = createHash("sha1").update(fingerprint).digest("hex").slice(0, 8);
  return `${slugify(candidate.title) || "source"}-${suffix}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: URL | string, accept: string, label: string): Promise<Response> {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept },
      signal: AbortSignal.timeout(20000),
    });
    lastStatus = response.status;
    if (response.ok) return response;
    if (response.status !== 429 && response.status < 500) {
      throw new Error(`${label} returned ${response.status}`);
    }

    const retryAfter = Number(response.headers.get("retry-after"));
    const backoffMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1000, 5000)
      : 1000 * (attempt + 1);
    await sleep(backoffMs);
  }
  throw new Error(`${label} returned ${lastStatus} after retries`);
}

async function markdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const groups = await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    if (entry.isFile() && entry.name.endsWith(".md") && entry.name.toLowerCase() !== "readme.md") return [full];
    return [];
  }));
  return groups.flat();
}

function parseFrontmatter(text: string) {
  const normalized = text.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return null;
  const closing = normalized.indexOf("\n---\n", 4);
  if (closing === -1) return null;
  return YAML.parse(normalized.slice(4, closing)) as Record<string, unknown>;
}

async function existingKeys() {
  const ids = new Set<string>();
  const urls = new Set<string>();
  const dois = new Set<string>();
  for (const file of await markdownFiles(SOURCE_ROOT)) {
    const node = parseFrontmatter(await readFile(file, "utf8"));
    if (!node) continue;
    if (typeof node.id === "string") ids.add(node.id);
    const source = node.source as Record<string, unknown> | undefined;
    if (typeof source?.url === "string") urls.add(source.url);
    const identifiers = source?.identifiers as Record<string, unknown> | undefined;
    if (typeof identifiers?.doi === "string") {
      const doi = canonicalDoi(identifiers.doi);
      if (doi) dois.add(doi);
    }
  }
  return { ids, urls, dois };
}

const STOP = new Set(["the", "and", "for", "with", "from", "god", "moral", "morality", "objective"]);

function relevance(title: string, query: string) {
  const titleWords = new Set(slugify(title).split("-").filter((word) => word.length > 3 && !STOP.has(word)));
  return slugify(query).split("-").filter((word) => word.length > 3 && !STOP.has(word) && titleWords.has(word)).length;
}

function passesRequiredTerms(title: string, target: QueryTarget) {
  if (!target.required_any?.length) return true;
  const normalized = ` ${slugify(title).replaceAll("-", " ")} `;
  return target.required_any.some((term) => normalized.includes(` ${slugify(term).replaceAll("-", " ")} `));
}

function relevantToTarget(title: string, target: QueryTarget) {
  return passesRequiredTerms(title, target) && relevance(title, target.query) >= 1;
}

async function webCandidates(seeds: WebSeed[]): Promise<Candidate[]> {
  const candidates: Candidate[] = [];
  for (const seed of seeds) {
    let indexed = false;
    try {
      const response = await fetchWithRetry(seed.url, "text/html,application/xhtml+xml", "web seed");
      indexed = response.ok;
    } catch {
      indexed = false;
    }
    candidates.push({
      ...seed,
      provider: "web",
      externalId: seed.url,
      indexed,
    });
    await sleep(350);
  }
  return candidates;
}

async function openAlexCandidates(target: QueryTarget, limit: number): Promise<Candidate[]> {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", target.query);
  url.searchParams.set("per-page", String(Math.max(limit * 3, 10)));

  const response = await fetchWithRetry(url, "application/json", "OpenAlex");
  const payload = await response.json() as { results?: Array<Record<string, unknown>> };
  const candidates: Candidate[] = [];

  for (const work of payload.results ?? []) {
    const title = typeof work.title === "string" ? work.title : "";
    if (!title || !relevantToTarget(title, target)) continue;

    const doi = canonicalDoi(typeof work.doi === "string" ? work.doi : undefined);
    const openalex = typeof work.id === "string" ? work.id : undefined;
    const primary = work.primary_location as Record<string, unknown> | undefined;
    const landing = typeof primary?.landing_page_url === "string" ? primary.landing_page_url : undefined;
    const venue = primary?.source as Record<string, unknown> | undefined;
    const resolvedUrl = doi ? `https://doi.org/${doi}` : landing ?? openalex;
    if (!resolvedUrl) continue;

    const authorships = Array.isArray(work.authorships) ? work.authorships : [];
    const authors = authorships.map((item) => {
      const author = (item as Record<string, unknown>).author as Record<string, unknown> | undefined;
      return typeof author?.display_name === "string" ? author.display_name : "";
    }).filter(Boolean).slice(0, 8);

    candidates.push({
      title,
      topic: target.topic,
      url: resolvedUrl,
      kind: String(work.type ?? "").includes("book") ? "book" : "paper",
      authors,
      year: typeof work.publication_year === "number" ? work.publication_year : undefined,
      publisher: typeof venue?.display_name === "string" ? venue.display_name : undefined,
      role: "scholarship",
      difficulty: "advanced",
      stance: "neutral",
      tags: ["harvested", "academic"],
      doi,
      openalex,
      provider: "openalex",
      query: target.query,
      externalId: openalex,
      indexed: true,
    });
    if (candidates.length >= limit) break;
  }

  return candidates;
}

async function crossrefCandidates(target: QueryTarget, limit: number): Promise<Candidate[]> {
  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("query.bibliographic", target.query);
  url.searchParams.set("rows", String(Math.max(limit * 3, 10)));

  const response = await fetchWithRetry(url, "application/json", "Crossref");
  const payload = await response.json() as { message?: { items?: Array<Record<string, unknown>> } };
  const candidates: Candidate[] = [];

  for (const item of payload.message?.items ?? []) {
    const rawTitle = Array.isArray(item.title) ? item.title[0] : item.title;
    const title = typeof rawTitle === "string" ? rawTitle : "";
    if (!title || !relevantToTarget(title, target)) continue;

    const doi = canonicalDoi(typeof item.DOI === "string" ? item.DOI : undefined);
    const resolvedUrl = typeof item.URL === "string" ? item.URL : doi ? `https://doi.org/${doi}` : undefined;
    if (!resolvedUrl) continue;

    const authorRecords = Array.isArray(item.author) ? item.author : [];
    const authors = authorRecords.map((record) => {
      const author = record as Record<string, unknown>;
      return [author.given, author.family].filter((part): part is string => typeof part === "string").join(" ");
    }).filter(Boolean).slice(0, 8);

    const issued = item.issued as { ["date-parts"]?: number[][] } | undefined;
    const type = String(item.type ?? "");

    candidates.push({
      title,
      topic: target.topic,
      url: resolvedUrl,
      kind: type.includes("book") ? "book" : type.includes("journal") ? "paper" : "article",
      authors,
      year: issued?.["date-parts"]?.[0]?.[0],
      publisher: typeof item.publisher === "string" ? item.publisher : undefined,
      role: "scholarship",
      difficulty: "advanced",
      stance: "neutral",
      tags: ["harvested", "academic"],
      doi,
      provider: "crossref",
      query: target.query,
      externalId: typeof item.DOI === "string" ? item.DOI : resolvedUrl,
      indexed: true,
    });
    if (candidates.length >= limit) break;
  }

  return candidates;
}

function markdown(candidate: Candidate, id: string) {
  const identifiers: Record<string, string> = {};
  if (candidate.doi) identifiers.doi = candidate.doi;
  if (candidate.openalex) identifiers.openalex = candidate.openalex;

  const source: Record<string, unknown> = {
    kind: candidate.kind,
    authors: candidate.authors?.length ? candidate.authors : undefined,
    year: candidate.year,
    publisher: candidate.publisher,
    url: candidate.url,
    role: candidate.role,
    difficulty: candidate.difficulty,
    stance: candidate.stance,
    identifiers: Object.keys(identifiers).length ? identifiers : undefined,
  };
  Object.keys(source).forEach((key) => source[key] === undefined && delete source[key]);

  const discovery: Record<string, unknown> = {
    provider: candidate.provider,
    query: candidate.query,
    retrieved_at: new Date().toISOString(),
    external_id: candidate.externalId,
  };
  Object.keys(discovery).forEach((key) => discovery[key] === undefined && delete discovery[key]);

  const node = {
    id,
    title: candidate.title,
    type: "source",
    topics: [candidate.topic],
    relationships: [],
    tags: [...new Set(["harvested", ...(candidate.tags ?? [])])],
    status: { editorial: "draft" },
    processing: {
      discovered: true,
      indexed: candidate.indexed,
      summarized: false,
      reviewed: false,
      discovery,
    },
    source,
  };

  return `---\n${YAML.stringify(node, { lineWidth: 0 }).trimEnd()}\n---\n\n# Harvested source candidate\n\nThis record was discovered automatically and contains metadata only. It has not yet been summarized or integrated into the graph.\n\nUse \`npm run sources:packet -- ${id}\` to prepare the graph context for agent review.\n`;
}

async function main() {
  const config = YAML.parse(await readFile(CONFIG_FILE, "utf8")) as HarvestConfig;
  const existing = await existingKeys();
  const candidates: Candidate[] = [];

  if (config.providers?.web?.enabled !== false) {
    candidates.push(...await webCandidates(config.providers?.web?.seeds ?? []));
  }

  if (config.providers?.openalex?.enabled !== false) {
    for (const target of config.providers?.openalex?.queries ?? []) {
      try {
        candidates.push(...await openAlexCandidates(target, config.providers?.openalex?.per_query ?? 2));
      } catch (error) {
        console.warn(error instanceof Error ? error.message : String(error));
      }
      await sleep(1250);
    }
  }

  if (config.providers?.crossref?.enabled !== false) {
    for (const target of config.providers?.crossref?.queries ?? []) {
      try {
        candidates.push(...await crossrefCandidates(target, config.providers?.crossref?.per_query ?? 2));
      } catch (error) {
        console.warn(error instanceof Error ? error.message : String(error));
      }
      await sleep(1250);
    }
  }

  const selected: Array<{ id: string; candidate: Candidate }> = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const id = idFor(candidate);
    const doi = canonicalDoi(candidate.doi);
    const key = doi ? `doi:${doi}` : `url:${candidate.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (existing.ids.has(id) || existing.urls.has(candidate.url) || (doi && existing.dois.has(doi))) continue;
    selected.push({ id, candidate });
    if (selected.length >= (config.max_new_sources ?? 8)) break;
  }

  if (!selected.length) {
    console.log("No new source candidates.");
    return;
  }

  await mkdir(HARVEST_ROOT, { recursive: true });

  for (const { id, candidate } of selected) {
    console.log(`${dryRun ? "would add" : "adding"} ${id} [${candidate.provider}] ${candidate.title}`);
    if (!dryRun) {
      await writeFile(path.join(HARVEST_ROOT, `${id}.md`), markdown(candidate, id), "utf8");
    }
  }

  console.log(`${dryRun ? "Found" : "Added"} ${selected.length} candidate(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
