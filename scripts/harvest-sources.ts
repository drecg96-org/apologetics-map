import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

type Provider = "web" | "openalex" | "crossref" | "rss" | "youtube";
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
  provider: Provider;
  query?: string;
  externalId?: string;
  indexed: boolean;
};

type QueryTarget = { topic: string; query: string; required_any?: string[] };
type WebSeed = Omit<Candidate, "provider" | "indexed" | "externalId">;
type FeedTarget = {
  topic: string;
  url: string;
  publisher?: string;
  required_any?: string[];
  tags?: string[];
  role?: Candidate["role"];
  difficulty?: Candidate["difficulty"];
  stance?: Candidate["stance"];
};
type YoutubeTarget = {
  topic: string;
  channel_url: string;
  publisher?: string;
  required_any?: string[];
  tags?: string[];
};

type HarvestConfig = {
  max_new_sources?: number;
  providers?: {
    web?: { enabled?: boolean; seeds?: WebSeed[] };
    rss?: { enabled?: boolean; per_feed?: number; feeds?: FeedTarget[] };
    youtube?: { enabled?: boolean; per_channel?: number; channels?: YoutubeTarget[] };
    openalex?: { enabled?: boolean; per_query?: number; queries?: QueryTarget[] };
    crossref?: { enabled?: boolean; per_query?: number; queries?: QueryTarget[] };
  };
};

const SOURCE_ROOT = path.resolve("content/sources");
const HARVEST_ROOT = path.join(SOURCE_ROOT, "harvested");
const CONFIG_FILE = path.resolve("config/source-harvest.yml");
const USER_AGENT = "apologetics-map-source-harvester/0.3 (+https://github.com/drecg96-org/apologetics-map)";
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
    if (response.status !== 429 && response.status < 500) throw new Error(`${label} returned ${response.status}`);

    const retryAfter = Number(response.headers.get("retry-after"));
    const backoffMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1000, 6000)
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

function hasRequiredTerms(title: string, required?: string[]) {
  if (!required?.length) return true;
  const haystack = ` ${slugify(title).replaceAll("-", " ")} `;
  return required.some((term) => haystack.includes(` ${slugify(term).replaceAll("-", " ")} `));
}

function relevantToTarget(title: string, target: QueryTarget) {
  return hasRequiredTerms(title, target.required_any) && relevance(title, target.query) >= 1;
}

function decodeXml(value: string) {
  return value
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function xmlText(block: string, tag: string) {
  const escaped = tag.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
  const match = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match?.[1] ? decodeXml(match[1]) : undefined;
}

function xmlLink(block: string) {
  const href = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1];
  if (href) return decodeXml(href);
  return xmlText(block, "link");
}

async function webCandidates(seeds: WebSeed[]): Promise<Candidate[]> {
  const candidates: Candidate[] = [];
  for (const seed of seeds) {
    let indexed = false;
    try {
      indexed = (await fetchWithRetry(seed.url, "text/html,application/xhtml+xml", "web seed")).ok;
    } catch {
      indexed = false;
    }
    candidates.push({ ...seed, provider: "web", externalId: seed.url, indexed });
    await sleep(300);
  }
  return candidates;
}

async function rssCandidates(feed: FeedTarget, limit: number, provider: "rss" | "youtube" = "rss"): Promise<Candidate[]> {
  const response = await fetchWithRetry(feed.url, "application/atom+xml,application/rss+xml,application/xml,text/xml", provider);
  const xml = await response.text();
  const entries = xml.match(/<item\b[\s\S]*?<\/item>|<entry\b[\s\S]*?<\/entry>/gi) ?? [];
  const candidates: Candidate[] = [];

  for (const entry of entries) {
    const title = xmlText(entry, "title");
    const url = xmlLink(entry);
    if (!title || !url || !hasRequiredTerms(title, feed.required_any)) continue;
    const published = xmlText(entry, "pubDate") ?? xmlText(entry, "published") ?? xmlText(entry, "updated");
    const date = published ? new Date(published) : null;
    const externalId = xmlText(entry, "yt:videoId") ?? xmlText(entry, "guid") ?? xmlText(entry, "id") ?? url;

    candidates.push({
      title,
      topic: feed.topic,
      url,
      kind: provider === "youtube" ? "video" : "article",
      publisher: feed.publisher,
      year: date && !Number.isNaN(date.getTime()) ? date.getUTCFullYear() : undefined,
      role: feed.role ?? (provider === "youtube" ? "primer" : "context"),
      difficulty: feed.difficulty ?? "beginner",
      stance: feed.stance,
      tags: [...new Set(["harvested", provider, "apologetics", ...(feed.tags ?? [])])],
      provider,
      query: feed.url,
      externalId,
      indexed: true,
    });
    if (candidates.length >= limit) break;
  }

  return candidates;
}

async function youtubeCandidates(channel: YoutubeTarget, limit: number): Promise<Candidate[]> {
  const page = await fetchWithRetry(channel.channel_url, "text/html", "YouTube channel");
  const html = await page.text();
  const channelId =
    html.match(/"channelId":"(UC[A-Za-z0-9_-]{20,})"/)?.[1] ??
    html.match(/"externalId":"(UC[A-Za-z0-9_-]{20,})"/)?.[1] ??
    html.match(/itemprop=["']channelId["'][^>]+content=["'](UC[^"']+)["']/i)?.[1];

  if (!channelId) throw new Error(`Unable to resolve YouTube channel ID for ${channel.channel_url}`);

  return rssCandidates({
    topic: channel.topic,
    url: `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
    publisher: channel.publisher,
    required_any: channel.required_any,
    tags: channel.tags,
    role: "primer",
    difficulty: "beginner",
  }, limit, "youtube");
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

  if (config.providers?.rss?.enabled !== false) {
    for (const feed of config.providers?.rss?.feeds ?? []) {
      try {
        candidates.push(...await rssCandidates(feed, config.providers?.rss?.per_feed ?? 3));
      } catch (error) {
        console.warn(`RSS ${feed.url}: ${error instanceof Error ? error.message : String(error)}`);
      }
      await sleep(500);
    }
  }

  if (config.providers?.youtube?.enabled !== false) {
    for (const channel of config.providers?.youtube?.channels ?? []) {
      try {
        candidates.push(...await youtubeCandidates(channel, config.providers?.youtube?.per_channel ?? 3));
      } catch (error) {
        console.warn(`YouTube ${channel.channel_url}: ${error instanceof Error ? error.message : String(error)}`);
      }
      await sleep(600);
    }
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

  const maxNew = config.max_new_sources ?? 16;
  const providerOrder: Provider[] = ["rss", "youtube", "openalex", "crossref", "web"];
  const queues = new Map(providerOrder.map((provider) => [provider, candidates.filter((candidate) => candidate.provider === provider)]));
  const selected: Array<{ id: string; candidate: Candidate }> = [];
  const seen = new Set<string>();

  function consider(candidate: Candidate) {
    const id = idFor(candidate);
    const doi = canonicalDoi(candidate.doi);
    const key = doi ? `doi:${doi}` : `url:${candidate.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    if (existing.ids.has(id) || existing.urls.has(candidate.url) || (doi && existing.dois.has(doi))) return false;
    selected.push({ id, candidate });
    return true;
  }

  while (selected.length < maxNew) {
    let progressed = false;
    for (const provider of providerOrder) {
      const queue = queues.get(provider)!;
      while (queue.length) {
        const candidate = queue.shift()!;
        progressed = true;
        if (consider(candidate)) break;
      }
      if (selected.length >= maxNew) break;
    }
    if (!progressed) break;
  }

  if (!selected.length) {
    console.log("No new source candidates.");
    return;
  }

  await mkdir(HARVEST_ROOT, { recursive: true });
  for (const { id, candidate } of selected) {
    console.log(`${dryRun ? "would add" : "adding"} ${id} [${candidate.provider}] ${candidate.title}`);
    if (!dryRun) await writeFile(path.join(HARVEST_ROOT, `${id}.md`), markdown(candidate, id), "utf8");
  }

  console.log(`${dryRun ? "Found" : "Added"} ${selected.length} candidate(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
