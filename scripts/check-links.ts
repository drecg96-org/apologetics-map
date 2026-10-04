import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const DIST = path.resolve("dist");
const BASE = process.env.GITHUB_ACTIONS ? "/apologetics-map/" : "/";

async function files(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(full);
    return [full];
  }))).flat();
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

function targetFor(href: string): string | null {
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) return null;

  const clean = href.split("#")[0].split("?")[0];
  if (!clean.startsWith("/")) return null;

  if (!clean.startsWith(BASE)) {
    throw new Error(`root-relative link escapes configured base "${BASE}": ${href}`);
  }

  let relative = clean.slice(BASE.length);
  if (!relative || relative.endsWith("/")) relative += "index.html";
  return path.join(DIST, relative);
}

async function main() {
  const all = await files(DIST);
  const htmlFiles = all.filter((file) => file.endsWith(".html"));
  const errors: string[] = [];

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    const hrefs = Array.from(html.matchAll(/href=["']([^"']+)["']/g), (match) => match[1]);

    for (const href of hrefs) {
      try {
        const target = targetFor(href);
        if (target && !(await exists(target))) {
          errors.push(`${path.relative(DIST, file)} -> ${href} (missing ${path.relative(DIST, target)})`);
        }
      } catch (error) {
        errors.push(`${path.relative(DIST, file)} -> ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  if (errors.length) {
    console.error("\nInternal link validation failed:\n");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`Internal links valid across ${htmlFiles.length} HTML files.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
