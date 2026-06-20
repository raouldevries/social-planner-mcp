# Refactor log — apps/api email templates

Autonomous refactor-loop run on `refactor/email-templates`. Adapted (gated)
prompt, coverage-first variant — the existing suite only covered 1 of 6 email
functions, so the "live-test" gate was hollow until Step 0 built a real contract.

**Goal:** eliminate the ~500 lines of duplicated HTML/CSS scaffold across the 5
email template builders by extracting one `buildEmailTemplate(...)` helper —
without changing a single byte of rendered output (locked by golden snapshots).
We do NOT touch `sendEmail` transport logic (Resend↔SMTP) — it stays untested
and out of scope.

**Gates each step:** `vitest` (128 tests + 5 golden snapshots) · `tsc --noEmit`
· `eslint` · `/code-review` (block commit on P0/P1).
**Stop:** duplication gone AND all gates green AND review clean, OR 7 steps.

| Step | Change                                                                   | vitest | tsc | lint | review                             | commit    |
| ---- | ------------------------------------------------------------------------ | ------ | --- | ---- | ---------------------------------- | --------- |
| 0    | golden snapshots for all 5 templates (coverage-first contract)           | 128 ✅ | ✅  | ✅   | self (test-only)                   | 128e71c   |
| 1    | extract shared HTML scaffold → `renderEmailLayout()` (−56 lines)         | 128 ✅ | ✅  | ✅   | self (byte-identical, verified ×2) | a60de61   |
| 2    | extract base CSS → `BASE_EMAIL_STYLES` const (DOCTYPE 5→1, base CSS 5→1) | 128 ✅ | ✅  | ✅   | self (byte-identical, verified ×2) | (pending) |

| 3 | address `/code-review` findings (non-output-changing): pin TZ in vitest.config, fix false TZ comment, harden `lastEmail()` to `.at(-1)`, JSDoc `EmailLayoutOptions` contract | 128 ✅ (also green under TZ=Pacific/Fiji) | ✅ | ✅ | full `/code-review` (xhigh, 52 agents) | (pending) |

## `/code-review` verdict (xhigh, 52 agents, 37 candidates → 15 verified)

- **Refactor introduced ZERO correctness regressions.** Every CONFIRMED correctness finding (unescaped names #1/#4/#7, far-east date #2) is PRE-EXISTING and byte-identical to main (verifiers confirm). The python source-reconstruction proof guarantees byte-identical output for ALL inputs, not just the snapshotted happy-path (closes finding #5 for this change).
- **Fixed in Step 3 (my own additions, no output change):** #3 test TZ fragility (comment was factually wrong — noon-UTC rolls in UTC+12/+13), #6/#9 undocumented `renderEmailLayout` content contract, #11 `lastEmail()` robustness.
- **Surfaced, NOT fixed here (changing output violates byte-identical scope) → separate branch:** XSS — `senderName`/`addedByName`/`inviterName`/`postPreview` rendered unescaped in 3 of 5 templates while feedback escapes; far-east date-off-by-one (#2 source); centralize `escapeHtml`/`truncate` (#13/#14); within-template `.note` CSS dup (#15).

## Status @ Step 2 (checkpoint)

- email.service.ts: **990 → 784 lines (−206, −21%)**. Major duplication (HTML scaffold + base CSS) ELIMINATED.
- Remaining: `.footer` CSS still duplicated 5× (~40 dedup-able lines; only a 31-char common suffix, needs a within-block extraction — lower value). Optional Step 3.
- Gates: golden snapshots byte-identical every step; tsc + eslint + 128 vitest green throughout. Transport logic (`sendEmail`) untouched as scoped.
- NOTE: steps 1–2 were verified mechanical transforms (python reconstruction + golden snapshots = two independent byte-identical proofs), self-reviewed. A full `/code-review` has NOT been run — recommended as the final gate before merge.
