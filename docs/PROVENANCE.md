# AgriNova — Provenance & IP Evidence Record

**© 2026 AgriNova. All rights reserved.** This document exists to establish, with dates, that AgriNova's design, source code, and database schema were created by this team over the period below — independent of any formal government copyright registration, which (per Uganda's Copyright and Neighbouring Rights Act) is not required for copyright to exist, but strengthens the ability to enforce it. Keep this file, and everything under `docs/evidence/`, under version control — the git history itself is part of the evidence.

## 1. What already proves authorship and timeline

Git commit history is the strongest evidence available here: every commit is cryptographically hashed, chained to the one before it, and carries an author and a timestamp that cannot be altered without changing the hash of everything after it. That makes a git history harder to fake retroactively than almost any other kind of dated document.

- **Full commit log, exported 2026-07-14**: [`evidence/git-commit-history-2026-07-14.txt`](./evidence/git-commit-history-2026-07-14.txt) — every commit from the first (**2026-05-21**) to the latest (**2026-07-14**), with date, author, and message.
- **Repository**: `github.com/develijah27-a11y/KULIMA` (private/public status tracked separately — see §4).
- **Database schema history, exported 2026-07-14**: [`evidence/schema-migration-filenames-2026-07-14.txt`](./evidence/schema-migration-filenames-2026-07-14.txt) — every migration filename is itself a timestamp (`YYYYMMDDHHMMSS_description.sql`), giving a second independent, dated record of the product's evolution that lines up with the commit history.
- **This documentation set** (`docs/PRODUCT_DOCUMENTATION.md`, this file) — a complete, dated description of every feature and how it works, useful both as onboarding material and as a snapshot of the product design at a point in time.

**Practical note on GitHub's own timestamps**: GitHub records a repository's creation date and each push's arrival time server-side, independent of what a commit's own metadata claims. If this repository's authorship is ever disputed, GitHub support can, on request, confirm when a given commit was actually received by their servers — which is why keeping the code in one continuously-pushed GitHub repo (rather than re-uploading it elsewhere later) matters for evidentiary purposes.

## 2. Recommended additions (not yet automated — do these yourself, ideally today)

These take a few minutes each and meaningfully strengthen the record:

1. **Tag this exact point in history.** `git tag -a v-prelaunch-2026-07-14 -m "Pre-launch snapshot"` and push the tag (`git push origin v-prelaunch-2026-07-14`). A signed/annotated tag is a permanent, dated marker in the history that's harder to dispute than a commit message alone.
2. **Register with Uganda's Registration Services Bureau (URSB).** Common-law copyright exists automatically, but formal registration gives you a government-issued certificate with a filing date — the single strongest piece of evidence if this ever goes to a dispute. You mentioned this is already in progress; once you have a registration/reference number, add it to this file.
3. **Email yourself (or a lawyer/notary) a zip of the repo at a milestone, unopened.** A timestamped email with the archive attached, sent to an account you don't later modify, is a classic and still-effective "poor man's copyright" corroborating record — cheap insurance alongside the git history.
4. **Keep design/product-requirement notes in this repo, not in a chat app.** Anything currently living only in WhatsApp/Telegram/email threads about feature decisions should get copied into `docs/` (even as a rough dump) so it's covered by the same git-history timestamping as the code.
5. **Dated screenshots at each release.** After each meaningful release, save 3–5 screenshots of the live app into `docs/evidence/screenshots/YYYY-MM-DD/` and commit them. This wasn't backfilled for past versions (the app would need to be rebuilt and run at each historical commit to reproduce old screens, which isn't a good use of time this close to launch) — start it going forward instead, beginning with your next deploy.

## 3. Security audit trail (also part of the provenance record)

A structured pre-launch security audit was run on 2026-07-14, covering authorization/IDOR, payment/escrow integrity, Supabase RLS policies, input validation, and session/rate-limiting. The full findings are preserved at:

**https://claude.ai/code/artifact/6c0c39ac-0f97-44d3-bf79-85f6a26140f7**

The two most severe findings — a direct wallet-balance-forgery hole in the database's Row Level Security policies, and a fully public KYC-document storage bucket — were fixed the same day, along with an admin self-promotion hole discovered while verifying the wallet fix (a user could otherwise PATCH their own `profiles.role` to `admin` directly via the REST API — closed with a database trigger). The fix is `supabase/migrations/20260714000001_critical_security_fixes.sql`, applied to the live database and covered in detail by that migration file's own comments.

Also discovered during this pass: **an undocumented set of RLS policies existed on the live database that were never captured in any migration file** — they must have been applied directly through the Supabase dashboard at some point. This is worth knowing for its own sake: any future schema change should go through a migration file (`supabase/migrations/`), not the dashboard SQL editor, or the same gap (a live database that migrations alone can't reproduce) will recur. This applies to at least two tables (`delivery_locations`, `group_listing_contributions`) found during the same audit, in addition to the policy set.

## 4. Repository access control

As of 2026-07-14, the GitHub repository (`develijah27-a11y/KULIMA`) is **public** — anyone can read the full source code, including the (now-fixed) vulnerabilities described above and all commit history. For a proprietary product ahead of a public launch, this is worth changing:

- Repo → Settings → General → Danger Zone → **Change visibility → Private**.
- If Vercel's deploy hook is connected via the public GitHub App integration, verify it still has access after flipping to private (usually automatic if installed via the Vercel GitHub App, since that grant is per-repo).
- Making the repo private does **not** remove any code that's already been cloned or scraped while it was public — if this repository has been public since its first commit (2026-05-21), assume any code visible in that window may already exist in someone else's cache. This isn't a reason not to lock it down now, just a reason not to treat "make it private" as fully undoing exposure that already happened.

## 5. Copyright notice placement

A visible copyright notice — `© 2026 AgriNova. All rights reserved.` — is shown in the public landing page footer (`src/app/page.tsx`). This is a *notice*, not a registration; it puts visitors on notice that the work is claimed and not public domain, which matters even before formal government registration completes. Update the year annually.
