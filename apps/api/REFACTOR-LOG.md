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

| Step | Change                                                           | vitest | tsc | lint | review                             | commit    |
| ---- | ---------------------------------------------------------------- | ------ | --- | ---- | ---------------------------------- | --------- |
| 0    | golden snapshots for all 5 templates (coverage-first contract)   | 128 ✅ | ✅  | ✅   | self (test-only)                   | 128e71c   |
| 1    | extract shared HTML scaffold → `renderEmailLayout()` (−56 lines) | 128 ✅ | ✅  | ✅   | self (byte-identical, verified ×2) | (pending) |
