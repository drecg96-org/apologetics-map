type Env = {
  GITHUB_APP_CLIENT_ID: string;
  GITHUB_PRIVATE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  SITE_ORIGIN: string;
  SITE_BASE_PATH: string;
  ALLOWED_ORIGINS: string;
  TURNSTILE_EXPECTED_HOSTNAME: string;
};

type Topic = { id: string; title: string };
type Move = { id: string; title: string; label: string };
type FeedbackPayload = {
  kind: string;
  feedback: string;
  submitterName?: string;
  turnstileToken: string;
  node: {
    id: string;
    title: string;
    type: string;
    file: string;
    topics?: Topic[];
    previousMoves?: Move[];
    nextMoves?: Move[];
  };
};

const API_VERSION = "2026-03-10";
const KINDS = new Set(["Question", "Response", "Objection", "Missing evidence", "Correction", "Other"]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const allowed = env.ALLOWED_ORIGINS.split(",").map((x) => x.trim()).filter(Boolean);
    const originAllowed = allowed.includes(origin);

    if (request.method === "OPTIONS") {
      return originAllowed
        ? new Response(null, { status: 204, headers: cors(origin) })
        : respond({ ok: false, error: "Origin not allowed" }, 403);
    }
    if (!originAllowed) return respond({ ok: false, error: "Origin not allowed" }, 403);

    const url = new URL(request.url);
    if (request.method !== "POST" || !["/", "/feedback"].includes(url.pathname)) {
      return respond({ ok: false, error: "Not found" }, 404, origin);
    }

    const length = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(length) && length > 20000) {
      return respond({ ok: false, error: "Request too large" }, 413, origin);
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return respond({ ok: false, error: "Invalid JSON" }, 400, origin);
    }

    const parsed = validatePayload(raw);
    if (!parsed.ok) return respond({ ok: false, error: parsed.error }, 400, origin);

    const remoteIp = request.headers.get("CF-Connecting-IP") ?? undefined;
    if (!(await verifyTurnstile(parsed.value.turnstileToken, remoteIp, env))) {
      return respond({ ok: false, error: "Verification failed" }, 400, origin);
    }

    try {
      const jwt = await createAppJwt(env.GITHUB_APP_CLIENT_ID, env.GITHUB_PRIVATE_KEY);
      const installationId = await getInstallationId(jwt, env);
      const token = await createInstallationToken(jwt, installationId, env);
      const issue = await createIssue(token, parsed.value, env);
      return respond({ ok: true, issueNumber: issue.number, issueUrl: issue.html_url }, 201, origin);
    } catch (error) {
      console.error("node feedback submission failed", error);
      return respond({ ok: false, error: "Unable to create issue" }, 502, origin);
    }
  },
};

function cors(origin: string): HeadersInit {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    "vary": "Origin",
  };
}

function respond(body: unknown, status = 200, origin?: string): Response {
  const headers: HeadersInit = { "content-type": "application/json; charset=utf-8" };
  if (origin) Object.assign(headers, cors(origin));
  return new Response(JSON.stringify(body), { status, headers });
}

function validatePayload(raw: unknown):
  | { ok: true; value: FeedbackPayload }
  | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Missing payload" };
  const value = raw as Record<string, unknown>;
  const node = value.node as Record<string, unknown> | undefined;

  const kind = cleanLine(value.kind, 40);
  const feedback = cleanText(value.feedback, 4000);
  const submitterName = cleanLine(value.submitterName, 80);
  const turnstileToken = cleanLine(value.turnstileToken, 2048);
  const id = cleanLine(node?.id, 120);
  const title = cleanLine(node?.title, 240);
  const type = cleanLine(node?.type, 40);
  const file = cleanLine(node?.file, 320);

  if (!KINDS.has(kind)) return { ok: false, error: "Invalid contribution type" };
  if (!feedback) return { ok: false, error: "Response is required" };
  if (!turnstileToken) return { ok: false, error: "Verification token is required" };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) return { ok: false, error: "Invalid node ID" };
  if (!title || !type || !file) return { ok: false, error: "Incomplete node context" };

  return {
    ok: true,
    value: {
      kind,
      feedback,
      submitterName,
      turnstileToken,
      node: {
        id,
        title,
        type,
        file,
        topics: cleanTopics(node?.topics),
        previousMoves: cleanMoves(node?.previousMoves),
        nextMoves: cleanMoves(node?.nextMoves),
      },
    },
  };
}

function cleanLine(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[\\r\\n\\t]+/g, " ").trim().slice(0, max) : "";
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanTopics(value: unknown): Topic[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const id = cleanLine(row.id, 120);
    const title = cleanLine(row.title, 240);
    return id && title ? [{ id, title }] : [];
  });
}

function cleanMoves(value: unknown): Move[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const id = cleanLine(row.id, 120);
    const title = cleanLine(row.title, 240);
    const label = cleanLine(row.label, 120);
    return id && title ? [{ id, title, label: label || "move" }] : [];
  });
}

async function verifyTurnstile(token: string, remoteIp: string | undefined, env: Env): Promise<boolean> {
  const form = new FormData();
  form.set("secret", env.TURNSTILE_SECRET_KEY);
  form.set("response", token);
  form.set("idempotency_key", crypto.randomUUID());
  if (remoteIp) form.set("remoteip", remoteIp);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  const result = await response.json() as { success?: boolean; action?: string; hostname?: string };
  const hostnameOk = !env.TURNSTILE_EXPECTED_HOSTNAME || result.hostname === env.TURNSTILE_EXPECTED_HOSTNAME;
  return Boolean(result.success && result.action === "node-feedback" && hostnameOk);
}

async function getInstallationId(jwt: string, env: Env): Promise<number> {
  const response = await githubFetch(
    "https://api.github.com/repos/" + encodeURIComponent(env.GITHUB_OWNER) + "/" +
      encodeURIComponent(env.GITHUB_REPO) + "/installation",
    jwt,
  );
  const data = await response.json() as { id?: number };
  if (!response.ok || !data.id) throw new Error("Installation lookup failed: " + response.status);
  return data.id;
}

async function createInstallationToken(jwt: string, installationId: number, env: Env): Promise<string> {
  const response = await githubFetch(
    "https://api.github.com/app/installations/" + installationId + "/access_tokens",
    jwt,
    {
      method: "POST",
      body: JSON.stringify({
        repositories: [env.GITHUB_REPO],
        permissions: { issues: "write" },
      }),
    },
  );
  const data = await response.json() as { token?: string };
  if (!response.ok || !data.token) throw new Error("Token creation failed: " + response.status);
  return data.token;
}

async function createIssue(
  token: string,
  payload: FeedbackPayload,
  env: Env,
): Promise<{ number: number; html_url: string }> {
  const tick = String.fromCharCode(96);
  const pageUrl =
    env.SITE_ORIGIN.replace(/\\\/$/, "") + "/" +
    env.SITE_BASE_PATH.replace(/^\\/+|\\/+$/g, "") +
    "/node/" + encodeURIComponent(payload.node.id) + "/";

  const formatMoves = (moves: Move[] = []) =>
    moves.length
      ? moves.map((move) => "- " + move.label + ": " + move.title + " (" + tick + move.id + tick + ")").join("\\n")
      : "- None";

  const topicLines = payload.node.topics?.length
    ? payload.node.topics.map((topic) => "- " + topic.title + " (" + tick + topic.id + tick + ")").join("\\n")
    : "- None";

  const title = ("[Node feedback] " + payload.kind + ": " + payload.node.title).slice(0, 240);
  const body = [
    "## Contribution",
    "**Kind:** " + payload.kind,
    "**Submitted by:** " + (payload.submitterName || "Anonymous"),
    "",
    payload.feedback,
    "",
    "## Node context",
    "- **Node:** " + payload.node.title + " (" + tick + payload.node.id + tick + ")",
    "- **Type:** " + payload.node.type,
    "- **Page:** " + pageUrl,
    "- **Content file:** " + tick + payload.node.file.replaceAll(tick, "'") + tick,
    "",
    "### Topic",
    topicLines,
    "",
    "### Previous debate moves",
    formatMoves(payload.node.previousMoves),
    "",
    "### Possible next moves",
    formatMoves(payload.node.nextMoves),
    "",
    "<!-- node-feedback:v1 -->",
  ].join("\\n");

  const response = await githubFetch(
    "https://api.github.com/repos/" + encodeURIComponent(env.GITHUB_OWNER) + "/" +
      encodeURIComponent(env.GITHUB_REPO) + "/issues",
    token,
    { method: "POST", body: JSON.stringify({ title, body }) },
  );
  const data = await response.json() as { number?: number; html_url?: string };
  if (!response.ok || !data.number || !data.html_url) {
    throw new Error("Issue creation failed: " + response.status);
  }
  return { number: data.number, html_url: data.html_url };
}

function githubFetch(url: string, bearer: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/vnd.github+json");
  headers.set("authorization", "Bearer " + bearer);
  headers.set("content-type", "application/json");
  headers.set("user-agent", "apologetics-map-feedback-worker");
  headers.set("x-github-api-version", API_VERSION);
  return fetch(url, { ...init, headers });
}

async function createAppJwt(clientId: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64Url(new TextEncoder().encode(JSON.stringify({
    iat: now - 60,
    exp: now + 9 * 60,
    iss: clientId,
  })));
  const signingInput = header + "." + payload;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  return signingInput + "." + base64Url(new Uint8Array(signature));
}

function pemToPkcs8(pem: string): Uint8Array {
  const normalized = pem.replace(/\\\\n/g, "\\n").trim();
  const isPkcs1 = normalized.includes("BEGIN RSA PRIVATE KEY");
  const base64 = normalized
    .replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----/g, "")
    .replace(/-----END (?:RSA )?PRIVATE KEY-----/g, "")
    .replace(/\\s+/g, "");
  if (!base64) throw new Error("GitHub private key is empty");
  const der = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return isPkcs1 ? wrapPkcs1AsPkcs8(der) : der;
}

function wrapPkcs1AsPkcs8(pkcs1: Uint8Array): Uint8Array {
  const version = new Uint8Array([0x02, 0x01, 0x00]);
  const algorithm = new Uint8Array([
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
  ]);
  const privateKey = concatBytes(new Uint8Array([0x04]), derLength(pkcs1.length), pkcs1);
  const body = concatBytes(version, algorithm, privateKey);
  return concatBytes(new Uint8Array([0x30]), derLength(body.length), body);
}

function derLength(length: number): Uint8Array {
  if (length < 128) return new Uint8Array([length]);
  const bytes: number[] = [];
  let remaining = length;
  while (remaining > 0) {
    bytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }
  return new Uint8Array([0x80 | bytes.length, ...bytes]);
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\\+/g, "-").replace(/\\//g, "_");
}
