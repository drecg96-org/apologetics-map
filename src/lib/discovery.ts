import type { DiscoveryIndex } from "./graph";

export type DiscoveryResult = {
  id: string;
  title: string;
  type: string;
  summary?: string;
  score: number;
  reason: string;
};

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "because", "but", "by", "can",
  "could", "did", "do", "does", "for", "from", "god", "how", "i", "if", "in",
  "is", "it", "of", "on", "or", "should", "that", "the", "this", "to", "was",
  "were", "what", "when", "where", "which", "who", "why", "with", "would",
]);

const EXPANSIONS: Record<string, string[]> = {
  evil: ["suffering", "pain", "horrendous", "animal"],
  suffering: ["evil", "pain", "horrendous"],
  hidden: ["hiddenness", "nonbelief", "nonresistant"],
  hiddenness: ["hidden", "nonbelief", "nonresistant"],
  believe: ["belief", "nonbelief", "faith"],
  christianity: ["christian", "jesus", "resurrection"],
  christian: ["christianity", "jesus"],
  islam: ["muslim", "quran", "muhammad"],
  muslim: ["islam", "quran", "muhammad"],
  jewish: ["judaism", "messiah", "torah"],
  judaism: ["jewish", "messiah", "torah"],
  bible: ["scripture", "biblical", "textual", "manuscript"],
  quran: ["islam", "textual", "manuscript", "muhammad"],
  proof: ["evidence", "argument", "reason"],
  prove: ["evidence", "argument", "reason"],
  evidence: ["proof", "argument", "reason"],
  morality: ["moral", "ethics", "objective"],
  moral: ["morality", "ethics", "objective"],
  freewill: ["freedom", "choice"],
  freedom: ["freewill", "choice"],
  hell: ["judgment", "annihilationism", "universalism"],
  saved: ["salvation", "heaven", "hell"],
  save: ["salvation", "heaven", "hell"],
  resurrection: ["raised", "risen", "empty", "tomb"],
  raised: ["resurrection", "risen"],
  trinity: ["triune", "three", "monotheism"],
  evolution: ["macroevolution", "naturalism"],
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(query: string) {
  const base = normalize(query)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));

  const expanded = new Set(base);
  for (const token of base) {
    for (const related of EXPANSIONS[token] ?? []) expanded.add(related);
  }
  return [...expanded];
}

function occurrences(haystack: string, needle: string) {
  if (!needle) return 0;
  let count = 0;
  let index = 0;
  while ((index = haystack.indexOf(needle, index)) !== -1) {
    count += 1;
    index += needle.length;
    if (count >= 6) break;
  }
  return count;
}

export function rankDiscoveryResults(
  index: DiscoveryIndex,
  query: string,
  limit = 6,
): DiscoveryResult[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];

  const tokens = tokenize(query);
  const rawTokens = normalize(query).split(/\s+/).filter((token) => token.length > 1);
  if (tokens.length === 0 && rawTokens.length === 0) return [];

  return index
    .map((node) => {
      const title = normalize(node.title);
      const id = normalize(node.id.replaceAll("-", " "));
      const summary = normalize(node.summary ?? "");
      const aliases = node.aliases.map(normalize);
      const tags = node.tags.map((tag) => normalize(tag.replaceAll("-", " ")));
      const searchText = normalize(node.searchText);

      let score = 0;
      const reasons: string[] = [];

      if (title === normalizedQuery) {
        score += 180;
        reasons.push("exact title");
      }
      if (aliases.some((alias) => alias === normalizedQuery)) {
        score += 170;
        reasons.push("question alias");
      }
      if (id === normalizedQuery) {
        score += 160;
        reasons.push("exact node");
      }
      if (title.includes(normalizedQuery) && normalizedQuery.length >= 5) {
        score += 75;
        reasons.push("title phrase");
      }
      if (aliases.some((alias) => alias.includes(normalizedQuery) || normalizedQuery.includes(alias))) {
        score += 65;
        reasons.push("alias phrase");
      }

      let matchedRaw = 0;
      for (const token of rawTokens) {
        const inTitle = occurrences(title, token);
        const inAliases = aliases.reduce((total, alias) => total + occurrences(alias, token), 0);
        const inTags = tags.reduce((total, tag) => total + occurrences(tag, token), 0);
        const inSummary = occurrences(summary, token);
        const inSearch = occurrences(searchText, token);

        if (inTitle + inAliases + inTags + inSummary + inSearch > 0) matchedRaw += 1;
        score += inTitle * 18 + inAliases * 16 + inTags * 8 + inSummary * 5 + Math.min(inSearch, 3) * 1.5;
      }

      for (const token of tokens.filter((token) => !rawTokens.includes(token))) {
        if (title.includes(token)) score += 7;
        else if (aliases.some((alias) => alias.includes(token))) score += 6;
        else if (tags.some((tag) => tag.includes(token))) score += 3;
        else if (searchText.includes(token)) score += 1;
      }

      const coverage = rawTokens.length ? matchedRaw / rawTokens.length : 0;
      score += coverage * 28;

      if (node.conversation?.opening) score += 18;
      if (node.type === "question") score += 12;
      else if (node.type === "topic") score += 7;
      else if (node.type === "argument") score += 3;
      else if (node.type === "source") score -= 18;

      if (node.crux) score += 3;

      const reason = reasons[0]
        ?? (coverage >= 0.8 ? "strong phrase match"
          : coverage >= 0.5 ? "matches several terms"
          : "related graph content");

      return {
        id: node.id,
        title: node.title,
        type: node.type,
        summary: node.summary,
        score,
        reason,
      };
    })
    .filter((result) => result.score >= 8)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}
