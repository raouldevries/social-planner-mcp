# Plan: Collaborator Feature Production Ready

> <!-- TODO: one-line subtitle describing the goal -->

| Field   | Value                                                                                     |
| ------- | ----------------------------------------------------------------------------------------- |
| Created | 2026-03-03                                                                                |
| Status  | Planning                                                                                  |
| Target  | Wire up notifications, activity logging, and UI improvements for the collaborator feature |

---

## Skills & Tools

### Default Skills

| Skill            | Role                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `/audit-loop`    | Each step = one audit-loop cycle (test-first, implement, self-audit, codex audit, commit) |
| `/handover`      | Session transitions — create handover doc at session boundaries                           |
| `/code-reviewer` | Quality gate before commits — review against audit files below                            |

### Project Skills

<!-- Add project-specific skills as rows:
| `/frontend-design` | UI component implementation |
| `/webapp-testing` | Browser-level verification |
| `/doc-coauthoring` | Documentation deliverables |
-->

### Audit References

| File                                                  | Purpose                                     |
| ----------------------------------------------------- | ------------------------------------------- |
| <!-- e.g. `memory-bank/skills/code-simplifier.md` --> | <!-- e.g. Code simplification standards --> |
| <!-- e.g. `.ruff.toml` -->                            | <!-- e.g. Linting configuration -->         |

---

## Implementation Workflow

### Per-Step Flowchart

```
┌─────────────────────────────────────────────────────────────┐
│  1. READ PLAN                                               │
│     - Review the current step requirements                  │
│     - Understand acceptance criteria and sub-steps          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. IMPLEMENT                                               │
│     - Use `/audit-loop` Phase 1 (test-first)               │
│     <!-- slot: additional implementation skills -->         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. AUDIT                                                   │
│     - `/code-reviewer` against audit references above       │
│     <!-- slot: project-specific audit steps -->             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. UPDATE PROGRESS                                         │
│     - Mark step as completed in Progress Tracking section   │
│     - Add notes about any deviations or learnings           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. ASK FOR CONFIRMATION                                    │
│     - Show summary of completed work                        │
│     - Wait for explicit approval before continuing          │
└─────────────────────────────────────────────────────────────┘
```

### Quality Gates

- [ ] `/audit-loop` was used for implementation (test-first)
- [ ] `/code-reviewer` audit passed
- [ ] Acceptance criteria from the step are met
- [ ] No regressions introduced
<!-- Add project-specific gates:
- [ ] Browser tests pass (`/webapp-testing`)
- [ ] UI matches design spec (`/frontend-design`)
      -->

---

## Context

### Current State

<!-- TODO: Summarize the current state of the codebase relevant to this plan -->

### Key Patterns Found

<!-- TODO: Document existing patterns, conventions, and APIs to reuse -->

### Critical Gaps

<!-- TODO: Identify what's missing or needs to change -->

---

## Phase 1: <!-- TODO: phase title -->

### Step 1.1: <!-- TODO: step title -->

**Complexity:** <!-- S | M | L -->

**Acceptance criteria:**

- [ ] <!-- TODO: concrete, testable criterion -->
- [ ] <!-- TODO: concrete, testable criterion -->

**Sub-steps:**

a. <!-- TODO: first sub-step -->
b. <!-- TODO: second sub-step -->
c. <!-- TODO: third sub-step -->

**Files:**

- `<!-- TODO: path/to/file -->`

**Dependencies:** None

<!-- Or: Steps X.Y, X.Z -->

---

<!-- Repeat Phase/Step blocks as needed:

## Phase 2: <!-- phase title -->

### Step 2.1: <!-- step title -->

...
-->

---

## Risk Areas & Recommendations

| Component     | Issue         | Recommendation |
| ------------- | ------------- | -------------- |
| <!-- TODO --> | <!-- TODO --> | <!-- TODO -->  |

### Breaking Changes

<!-- TODO: List any breaking changes, or "None expected" -->

### Testing Recommendations

<!-- TODO: Specific testing strategies beyond standard acceptance criteria -->

### Quick Wins

<!-- TODO: Low-effort, high-value items that can be done first -->

---

## Progress Tracking

### Phase 1: <!-- phase title -->

- [ ] Step 1.1: <!-- step title -->
<!-- - [ ] Step 1.2: title -->

<!-- ### Phase 2: phase title -->
<!-- - [ ] Step 2.1: title -->
