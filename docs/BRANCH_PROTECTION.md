# Recommended main-branch protection

Intended policy:

- normal changes to `main` arrive through pull requests;
- at least one approving review is required;
- code-owner review is required, with `@drecg96` as code owner;
- stale approvals are dismissed after new commits;
- review conversations must be resolved;
- the **Validate graph** check must pass;
- force pushes and branch deletion are blocked.

The repository owner may retain an administrator bypass for intentional direct pushes or recovery. Everyone else should use pull requests.

These controls live in GitHub under **Settings → Rules → Rulesets** (or branch protection settings).
