import { readFile } from "node:fs/promises";
import path from "node:path";

type BookDefinition = {
  file: string;
  name: string;
  code: string;
  aliases: string[];
};

export type ParsedScriptureReference = {
  raw: string;
  book: BookDefinition;
  chapter: number;
  verse?: number;
  endChapter?: number;
  endVerse?: number;
  canonical: string;
};

export type ScriptureVerse = {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
};

export type ScriptureLookup = ParsedScriptureReference & {
  verses: ScriptureVerse[];
  youVersionEsvUrl: string;
};

const ROOT = path.resolve(process.cwd(), "data", "scripture", "web");

const BOOKS: BookDefinition[] = [
  { file: "genesis", name: "Genesis", code: "GEN", aliases: ["Gen", "Ge", "Gn"] },
  { file: "exodus", name: "Exodus", code: "EXO", aliases: ["Exod", "Exo", "Ex"] },
  { file: "leviticus", name: "Leviticus", code: "LEV", aliases: ["Lev", "Lv"] },
  { file: "numbers", name: "Numbers", code: "NUM", aliases: ["Num", "Nu", "Nm"] },
  { file: "deuteronomy", name: "Deuteronomy", code: "DEU", aliases: ["Deut", "Dt"] },
  { file: "joshua", name: "Joshua", code: "JOS", aliases: ["Josh", "Jos"] },
  { file: "judges", name: "Judges", code: "JDG", aliases: ["Judg", "Jdg"] },
  { file: "ruth", name: "Ruth", code: "RUT", aliases: ["Ru"] },
  { file: "1samuel", name: "1 Samuel", code: "1SA", aliases: ["1 Sam", "1Sam", "I Samuel"] },
  { file: "2samuel", name: "2 Samuel", code: "2SA", aliases: ["2 Sam", "2Sam", "II Samuel"] },
  { file: "1kings", name: "1 Kings", code: "1KI", aliases: ["1 Kgs", "1Kgs", "I Kings"] },
  { file: "2kings", name: "2 Kings", code: "2KI", aliases: ["2 Kgs", "2Kgs", "II Kings"] },
  { file: "1chronicles", name: "1 Chronicles", code: "1CH", aliases: ["1 Chr", "1 Chron", "1Chr", "I Chronicles"] },
  { file: "2chronicles", name: "2 Chronicles", code: "2CH", aliases: ["2 Chr", "2 Chron", "2Chr", "II Chronicles"] },
  { file: "ezra", name: "Ezra", code: "EZR", aliases: ["Ezr"] },
  { file: "nehemiah", name: "Nehemiah", code: "NEH", aliases: ["Neh"] },
  { file: "esther", name: "Esther", code: "EST", aliases: ["Esth", "Est"] },
  { file: "job", name: "Job", code: "JOB", aliases: [] },
  { file: "psalms", name: "Psalms", code: "PSA", aliases: ["Psalm", "Ps", "Psa"] },
  { file: "proverbs", name: "Proverbs", code: "PRO", aliases: ["Prov", "Prv", "Pr"] },
  { file: "ecclesiastes", name: "Ecclesiastes", code: "ECC", aliases: ["Eccl", "Ecc"] },
  { file: "songofsolomon", name: "Song of Solomon", code: "SNG", aliases: ["Song of Songs", "Song", "SOS"] },
  { file: "isaiah", name: "Isaiah", code: "ISA", aliases: ["Isa"] },
  { file: "jeremiah", name: "Jeremiah", code: "JER", aliases: ["Jer"] },
  { file: "lamentations", name: "Lamentations", code: "LAM", aliases: ["Lam"] },
  { file: "ezekiel", name: "Ezekiel", code: "EZK", aliases: ["Ezek", "Eze"] },
  { file: "daniel", name: "Daniel", code: "DAN", aliases: ["Dan", "Dn"] },
  { file: "hosea", name: "Hosea", code: "HOS", aliases: ["Hos"] },
  { file: "joel", name: "Joel", code: "JOL", aliases: ["Jl"] },
  { file: "amos", name: "Amos", code: "AMO", aliases: ["Am"] },
  { file: "obadiah", name: "Obadiah", code: "OBA", aliases: ["Obad", "Ob"] },
  { file: "jonah", name: "Jonah", code: "JON", aliases: ["Jon"] },
  { file: "micah", name: "Micah", code: "MIC", aliases: ["Mic"] },
  { file: "nahum", name: "Nahum", code: "NAM", aliases: ["Nah", "Na"] },
  { file: "habakkuk", name: "Habakkuk", code: "HAB", aliases: ["Hab"] },
  { file: "zephaniah", name: "Zephaniah", code: "ZEP", aliases: ["Zeph", "Zep"] },
  { file: "haggai", name: "Haggai", code: "HAG", aliases: ["Hag"] },
  { file: "zechariah", name: "Zechariah", code: "ZEC", aliases: ["Zech", "Zec"] },
  { file: "malachi", name: "Malachi", code: "MAL", aliases: ["Mal"] },
  { file: "matthew", name: "Matthew", code: "MAT", aliases: ["Matt", "Mt"] },
  { file: "mark", name: "Mark", code: "MRK", aliases: ["Mk", "Mrk"] },
  { file: "luke", name: "Luke", code: "LUK", aliases: ["Lk"] },
  { file: "john", name: "John", code: "JHN", aliases: ["Jn", "Jhn"] },
  { file: "acts", name: "Acts", code: "ACT", aliases: ["Ac"] },
  { file: "romans", name: "Romans", code: "ROM", aliases: ["Rom", "Ro"] },
  { file: "1corinthians", name: "1 Corinthians", code: "1CO", aliases: ["1 Cor", "1Cor", "I Corinthians"] },
  { file: "2corinthians", name: "2 Corinthians", code: "2CO", aliases: ["2 Cor", "2Cor", "II Corinthians"] },
  { file: "galatians", name: "Galatians", code: "GAL", aliases: ["Gal"] },
  { file: "ephesians", name: "Ephesians", code: "EPH", aliases: ["Eph"] },
  { file: "philippians", name: "Philippians", code: "PHP", aliases: ["Phil", "Php"] },
  { file: "colossians", name: "Colossians", code: "COL", aliases: ["Col"] },
  { file: "1thessalonians", name: "1 Thessalonians", code: "1TH", aliases: ["1 Thess", "1Thess", "1 Thes"] },
  { file: "2thessalonians", name: "2 Thessalonians", code: "2TH", aliases: ["2 Thess", "2Thess", "2 Thes"] },
  { file: "1timothy", name: "1 Timothy", code: "1TI", aliases: ["1 Tim", "1Tim"] },
  { file: "2timothy", name: "2 Timothy", code: "2TI", aliases: ["2 Tim", "2Tim"] },
  { file: "titus", name: "Titus", code: "TIT", aliases: ["Tit"] },
  { file: "philemon", name: "Philemon", code: "PHM", aliases: ["Phlm", "Phm"] },
  { file: "hebrews", name: "Hebrews", code: "HEB", aliases: ["Heb"] },
  { file: "james", name: "James", code: "JAS", aliases: ["Jas", "Jm"] },
  { file: "1peter", name: "1 Peter", code: "1PE", aliases: ["1 Pet", "1Pet", "1 Pt"] },
  { file: "2peter", name: "2 Peter", code: "2PE", aliases: ["2 Pet", "2Pet", "2 Pt"] },
  { file: "1john", name: "1 John", code: "1JN", aliases: ["1 Jn", "1Jn", "I John"] },
  { file: "2john", name: "2 John", code: "2JN", aliases: ["2 Jn", "2Jn", "II John"] },
  { file: "3john", name: "3 John", code: "3JN", aliases: ["3 Jn", "3Jn", "III John"] },
  { file: "jude", name: "Jude", code: "JUD", aliases: [] },
  { file: "revelation", name: "Revelation", code: "REV", aliases: ["Rev", "Revelations"] },
];

function normalizeBook(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const byAlias = new Map<string, BookDefinition>();
for (const book of BOOKS) {
  for (const alias of [book.name, book.code, book.file, ...book.aliases]) {
    byAlias.set(normalizeBook(alias), book);
  }
}

function canonicalLabel(
  book: BookDefinition,
  chapter: number,
  verse?: number,
  endChapter?: number,
  endVerse?: number,
) {
  if (!verse) return `${book.name} ${chapter}`;
  if (!endVerse) return `${book.name} ${chapter}:${verse}`;
  if (endChapter && endChapter !== chapter) {
    return `${book.name} ${chapter}:${verse}-${endChapter}:${endVerse}`;
  }
  return `${book.name} ${chapter}:${verse}-${endVerse}`;
}

export function parseScriptureReference(input: string): ParsedScriptureReference | null {
  const normalized = input.trim().replace(/[–—]/g, "-").replace(/\s+/g, " ");
  const match = normalized.match(/^(.+?)\.?\s+(\d{1,3})(?::(\d{1,3})(?:\s*-\s*(?:(\d{1,3}):)?(\d{1,3}))?)?$/);
  if (!match) return null;

  const book = byAlias.get(normalizeBook(match[1]));
  if (!book) return null;

  const chapter = Number(match[2]);
  const verse = match[3] ? Number(match[3]) : undefined;
  const endChapter = match[4] ? Number(match[4]) : undefined;
  const endVerse = match[5] ? Number(match[5]) : undefined;

  return {
    raw: input,
    book,
    chapter,
    verse,
    endChapter,
    endVerse,
    canonical: canonicalLabel(book, chapter, verse, endChapter, endVerse),
  };
}

type WebBookFile = { name: string; chapters: string[][] };
const bookCache = new Map<string, Promise<WebBookFile>>();

async function loadBook(file: string): Promise<WebBookFile> {
  let pending = bookCache.get(file);
  if (!pending) {
    pending = readFile(path.join(ROOT, `${file}.json`), "utf8").then((raw) => JSON.parse(raw) as WebBookFile);
    bookCache.set(file, pending);
  }
  return pending;
}

export function youVersionEsvUrl(parsed: ParsedScriptureReference) {
  const start = `${parsed.book.code}.${parsed.chapter}`;
  if (!parsed.verse) return `https://www.bible.com/bible/59/${start}.ESV`;

  let passage = `${start}.${parsed.verse}`;
  if (parsed.endVerse) {
    passage += parsed.endChapter && parsed.endChapter !== parsed.chapter
      ? `-${parsed.book.code}.${parsed.endChapter}.${parsed.endVerse}`
      : `-${parsed.endVerse}`;
  }
  return `https://www.bible.com/bible/59/${passage}.ESV`;
}

export async function lookupScriptureReference(input: string): Promise<ScriptureLookup | null> {
  const parsed = parseScriptureReference(input);
  if (!parsed) return null;

  const book = await loadBook(parsed.book.file);
  const startChapterIndex = parsed.chapter - 1;
  if (!book.chapters[startChapterIndex]) return null;

  const verses: ScriptureVerse[] = [];
  const lastChapter = parsed.endChapter ?? parsed.chapter;

  for (let chapter = parsed.chapter; chapter <= lastChapter; chapter += 1) {
    const chapterVerses = book.chapters[chapter - 1];
    if (!chapterVerses) return null;

    const firstVerse = chapter === parsed.chapter ? (parsed.verse ?? 1) : 1;
    const lastVerse = chapter === lastChapter
      ? (parsed.endVerse ?? (parsed.verse && lastChapter === parsed.chapter ? parsed.verse : chapterVerses.length))
      : chapterVerses.length;

    if (firstVerse < 1 || lastVerse > chapterVerses.length || lastVerse < firstVerse) return null;

    for (let verse = firstVerse; verse <= lastVerse; verse += 1) {
      verses.push({
        id: `${parsed.book.code}.${chapter}.${verse}`,
        book: parsed.book.name,
        chapter,
        verse,
        text: chapterVerses[verse - 1],
      });
    }
  }

  return { ...parsed, verses, youVersionEsvUrl: youVersionEsvUrl(parsed) };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
}

const scanAliases = [...new Set(
  BOOKS.flatMap((book) => [book.name, book.code, ...book.aliases]),
)]
  .sort((a, b) => b.length - a.length)
  .map(escapeRegex);

const scanPattern = new RegExp(
  `(^|[^A-Za-z0-9])(${scanAliases.join("|")})\\.?\\s+(\\d{1,3})(?::(\\d{1,3})(?:\\s*[-–—]\\s*(?:(\\d{1,3}):)?(\\d{1,3}))?)?`,
  "gi",
);

export function findScriptureReferences(text: string): string[] {
  const found = new Map<string, string>();
  for (const match of text.matchAll(scanPattern)) {
    const book = match[2];
    const chapter = match[3];
    const verse = match[4];
    const endChapter = match[5];
    const endVerse = match[6];
    const candidate = verse
      ? `${book} ${chapter}:${verse}${endVerse ? `-${endChapter ? `${endChapter}:` : ""}${endVerse}` : ""}`
      : `${book} ${chapter}`;
    const parsed = parseScriptureReference(candidate);
    if (parsed) found.set(parsed.canonical, parsed.canonical);
  }
  return [...found.values()];
}

export async function scriptureStats() {
  const rawIndex = await readFile(path.join(ROOT, "index.json"), "utf8");
  const index = JSON.parse(rawIndex) as Array<{ file: string; chapters: number }>;
  let chapters = 0;
  let verses = 0;
  for (const item of index) {
    const book = await loadBook(item.file);
    chapters += book.chapters.length;
    verses += book.chapters.reduce((total, chapter) => total + chapter.length, 0);
  }
  return { books: index.length, chapters, verses };
}
