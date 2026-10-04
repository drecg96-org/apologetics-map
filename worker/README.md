# Node feedback Worker

This Cloudflare Worker is the credential boundary for public node feedback.

It accepts only structured node-feedback submissions from allowed origins, validates Cloudflare Turnstile server-side, authenticates as the GitHub App installation for `drecg96-org/apologetics-map`, narrows the installation token to that repository with `issues: write`, and creates a structured `[Node feedback]` issue.

Do not put GitHub or Turnstile secrets in the Astro site or GitHub Pages build.

See [../docs/NODE_FEEDBACK_SETUP.md](../docs/NODE_FEEDBACK_SETUP.md) for setup and deployment.
