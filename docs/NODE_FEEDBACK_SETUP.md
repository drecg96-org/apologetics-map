# Node feedback: GitHub App + Cloudflare Worker

The node-feedback feature has two operating modes:

1. **Fallback mode** — when no feedback API is configured, the node form opens a prefilled GitHub issue for the reader to submit.
2. **Direct mode** — when the Worker endpoint and Turnstile sitekey are configured, the form submits directly and the GitHub App creates the issue.

This means the feature can be merged safely before the Worker is configured. Nothing secret is shipped to the browser.

## Architecture

```text
node page
  -> optional display name + response
  -> Cloudflare Turnstile
  -> Cloudflare Worker
       -> validate origin
       -> validate Turnstile token
       -> create short-lived GitHub App installation token
       -> create issue in drecg96-org/apologetics-map
  -> [Node feedback] GitHub issue
  -> agent triage
  -> existing node OR new canonical semantic node
  -> research / sourcing when needed
```

The Worker constructs the GitHub issue itself. The browser cannot choose a repository or submit an arbitrary issue body to the bot.

## 1. Create the GitHub App

Create a GitHub App named something like **Apologetics Map Bot**.

Recommended settings:

- Installable only where you control it.
- Webhook: disabled; this workflow does not require one.
- Repository permission: **Issues — Read and write**.
- Leave repository Contents, Pull requests, Actions, Administration, and organization permissions unset unless another future feature explicitly needs them.
- Install the app on **only** `drecg96-org/apologetics-map`.

After creating the app:

1. Copy its **Client ID**.
2. Generate/download one private key (`.pem`).
3. Install the app on the repository.

The Worker discovers the installation ID from the repository at runtime, so you do not need to copy an installation ID.

## 2. Create Turnstile

In Cloudflare:

1. Open **Turnstile**.
2. Create a widget for `drecg96-org.github.io`.
3. Copy the **sitekey** (public).
4. Copy the **secret key** (private).

The Worker validates every Turnstile token with Siteverify, requires the `node-feedback` action, and checks the expected hostname.

## 3. Deploy the Worker

From the repository:

```bash
cd worker
npx wrangler@latest login
```

Add the required Worker secrets. Wrangler will prompt for the values; do not put them on the command line or commit them:

```bash
npx wrangler@latest secret put GITHUB_APP_CLIENT_ID
npx wrangler@latest secret put GITHUB_PRIVATE_KEY
npx wrangler@latest secret put TURNSTILE_SECRET_KEY
```

For `GITHUB_PRIVATE_KEY`, paste the entire PEM, including the BEGIN/END lines.

Deploy:

```bash
npx wrangler@latest deploy
```

Copy the resulting Worker URL. The endpoint accepts POSTs at either `/` or `/feedback`.

## 4. Enable direct submission in GitHub Pages

In the GitHub repository, add these **Actions repository variables**:

- `NODE_FEEDBACK_ENDPOINT` = the deployed Worker URL, preferably ending in `/feedback`
- `TURNSTILE_SITE_KEY` = the public Turnstile sitekey

The Pages workflow maps these to Astro's public build variables:

- `PUBLIC_NODE_FEEDBACK_ENDPOINT`
- `PUBLIC_TURNSTILE_SITE_KEY`

Redeploy the Pages site. When both are present, the node form switches from **Continue to GitHub** to **Submit response** and Turnstile appears.

If either variable is absent, the secure prefilled-GitHub fallback remains active.

## 5. Smoke test

Use a low-risk node and submit:

- Kind: Question
- Name: leave blank
- Response: `Feedback pipeline smoke test — safe to close.`

Verify:

1. Turnstile completes.
2. The form reports successful submission without navigating away.
3. GitHub receives a new issue opened by the GitHub App/bot.
4. The issue title begins with `[Node feedback]`.
5. The body contains `<!-- node-feedback:v1 -->`, the exact node ID, content file, topic, and nearby moves.
6. Close the smoke-test issue.

Then repeat once with an optional display name to verify attribution formatting.

## Issue-to-graph semantics

**Issues contain conversations. Nodes contain ideas.**

Do not introduce a `user-response` node type. If a reader raises an objection, the canonical graph representation is still an `objection`; a question remains a `question`; a response remains a `response`.

Agent triage has three normal outcomes:

### Already represented

Find the equivalent existing node and use the issue to improve wording, sourcing, or discoverability if needed. Do not create a duplicate node.

### New semantic contribution

Create a normal canonical node of the correct semantic type and connect it to the relevant debate position. Add provenance:

```yaml
origin:
  kind: user-feedback
  github_issues:
    - 143
```

Multiple independent submissions can point to the same canonical node by adding their issue numbers.

### New unresolved gap

Create the question/objection so the graph records the real conversational branch even before a good answer exists. Mark the conversational endpoint unresolved when appropriate, then run research/source discovery and add a sourced response later.

A useful agent starting point is:

```bash
npm run graph -- packet <node-id> --depth 2
```

The original GitHub issue remains the raw submission/provenance record. Optional submitter names belong in the issue; only copy personal attribution into canonical graph content when there is a specific editorial reason and the submitter clearly intended public attribution.

## Security notes

- Never put the GitHub App private key or Turnstile secret in `PUBLIC_*` variables.
- The Worker hardcodes the destination repository through its server-side configuration.
- Installation tokens are minted on demand and narrowed to the configured repository with `issues: write`.
- Turnstile is always validated server-side.
- CORS is restricted to the configured site origin.
- GitHub may apply secondary rate limits if issue creation is abused. Turnstile is the first anti-spam layer; add a Cloudflare rate-limiting rule/binding if real traffic shows the need.
