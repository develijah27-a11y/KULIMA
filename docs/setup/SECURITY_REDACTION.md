Security Redaction Report

Files identified with secrets (recommend immediate action):

- .env.local — REPLACED with placeholders in this commit.
- .claude/settings.json — contains API tokens and curl commands referencing `vcp_...`, `sbp_...`, `github_pat_...`, map tokens.
- .claude/settings.local.json — contains many `sbp_...` Supabase service role tokens and other secrets.
- Any `.claude/*` files may contain tokens (scan and redact).

Recommended remediation steps

1. Rotate all exposed keys immediately (Supabase service role keys, Vercel tokens, GitHub PATs, OpenAI, OpenRouteService, Mapbox/Stadia keys, NylonPay keys, Resend API key, etc.).
2. Remove secrets from the repository history using the `git filter-repo` or `git filter-branch` tool, or contact your SCM admin.
3. Add remaining sensitive files to `.gitignore` (existing rules already include `.env*.local` and `.claude/settings.local.json`). Consider adding `.claude/settings.json` if it contains secrets.
4. Replace committed secrets with environment-variable references and store them in the hosting provider secrets (Vercel, GitHub Secrets, Supabase project settings).
5. Audit `supabase/migrations` and any generated scripts for embedded credentials and remove them.
6. After rotation, verify that no service endpoints are accessible with the old keys.

Actions taken in this commit

- Replaced values in `.env.local` with `REDACTED_REMOVED_FROM_REPO` placeholders.
- Created this `SECURITY_REDACTION.md` report listing files and next steps.

If you want, I can:
- Redact `.claude/settings.json` and `.claude/settings.local.json` similarly in a follow-up patch.
- Add `.claude/settings.json` to `.gitignore` and commit.
- Run `git` commands to remove secrets from history (requires your confirmation).

Please tell me which of the above follow-up actions you'd like me to perform now.