---
name: self-improving-agent
description: "Captures learnings, errors, and corrections to enable continuous improvement. Use when: (1) A command or operation fails unexpectedly, (2) User corrects Claude ('No, that's wrong...', 'Actually...'), (3) User requests a capability that doesn't exist, (4) An external API or tool fails, (5) Claude realizes its knowledge is outdated or incorrect, (6) A better approach is discovered for a recurring task. Also review learnings before major tasks."
version: "4.0.2-claude"
metadata:
---

# Self-Improvement Skill

Log learnings and errors to markdown files for continuous improvement. Recurring patterns get promoted to CLAUDE.md (project or global) so every future session inherits them.

> **Local adaptation (2026-09-22):** retargeted from the OpenClaw build (v4.0.2) to Claude Code.
> Promotion targets are CLAUDE.md instead of SOUL.md/TOOLS.md/AGENTS.md; OpenClaw-only tooling
> (gateway hooks, sessions_* tools, workspace injection) removed. Upstream:
> https://github.com/pskoett/self-improving-agent — reinstalling from upstream reverts this
> adaptation; re-apply it (this notice marks what changed).

## Claude Code Setup

- **Skill location**: `.claude/skills/self-improving-agent/` (this project)
- **Invocation**: loaded via the Skill tool when a Detection Trigger fires, or explicitly as `/self-improving-agent`
- **Log files**: `.learnings/` in the project root (gitignored — see Gitignore Options)
- **Error detection**: model-driven via Detection Triggers below. Claude Code hooks (SessionStart/Stop in `settings.json`) could automate reminders and session-end sweeps but are NOT configured — do not wait for a hook; log when you notice a trigger

### Relationship to Claude Code's native memory

Claude Code auto-memory (`~/.claude/projects/<project>/memory/MEMORY.md`) already persists one-off
facts across sessions. Division of labor:

| Layer | Use for |
|---|---|
| `.learnings/` | Structured pattern tracking: IDs, statuses, Pattern-Key dedup, recurrence counts |
| Auto-memory | One-off facts/preferences (handled natively — don't duplicate here) |
| CLAUDE.md | Promoted, always-loaded rules — the promotion target of this skill |

## First-Use Initialisation

Before logging anything, ensure the `.learnings/` directory and files exist in the project root. If any are missing, create them (or copy from `assets/`):

```bash
mkdir -p .learnings
[ -f .learnings/LEARNINGS.md ] || printf "# Learnings\n\nCorrections, insights, and knowledge gaps captured during development.\n\n---\n" > .learnings/LEARNINGS.md
[ -f .learnings/ERRORS.md ] || printf "# Errors\n\nCommand failures and integration errors.\n\n---\n" > .learnings/ERRORS.md
[ -f .learnings/FEATURE_REQUESTS.md ] || printf "# Feature Requests\n\nCapabilities requested by the user.\n\n---\n" > .learnings/FEATURE_REQUESTS.md
```

Never overwrite existing files. This is a no-op if `.learnings/` is already initialised.

Do not log secrets, tokens, private keys, environment variables, or full source/config files unless the user explicitly asks for that level of detail. Prefer short summaries or redacted excerpts over raw command output or full transcripts.

## Quick Reference

| Situation | Action |
|-----------|--------|
| Command/operation fails | Log to `.learnings/ERRORS.md` |
| User corrects you | Log to `.learnings/LEARNINGS.md` with category `correction` |
| User wants missing feature | Log to `.learnings/FEATURE_REQUESTS.md` |
| API/external tool fails | Log to `.learnings/ERRORS.md` with integration details |
| Knowledge was outdated | Log to `.learnings/LEARNINGS.md` with category `knowledge_gap` |
| Found better approach | Log to `.learnings/LEARNINGS.md` with category `best_practice` |
| Similar to existing entry | Grep by `Pattern-Key` first, link with `**See Also**`, bump `Recurrence-Count` |
| Project-specific convention | Promote to project `CLAUDE.md` |
| Cross-project tool gotcha | Promote to global `~/.claude/CLAUDE.md` |

## Logging Format

### Learning Entry

Append to `.learnings/LEARNINGS.md`:

```markdown
## [LRN-YYYYMMDD-XXX] category

**Logged**: ISO-8601 timestamp
**Priority**: low | medium | high | critical
**Status**: pending
**Area**: frontend | backend | infra | tests | docs | config

### Summary
One-line description of what was learned

### Details
Full context: what happened, what was wrong, what's correct

### Suggested Action
Specific fix or improvement to make

### Metadata
- Source: conversation | error | user_feedback
- Related Files: path/to/file.ext
- Tags: tag1, tag2
- See Also: LRN-20250110-001 (if related to existing entry)
- Pattern-Key: area.symptom (recommended; e.g. deps.module-not-found — see Pattern-Key Taxonomy)
- Recurrence-Count: 1 (optional)
- First-Seen: 2025-01-15 (optional)
- Last-Seen: 2025-01-15 (optional)

---
```

### Error Entry

Append to `.learnings/ERRORS.md`:

```markdown
## [ERR-YYYYMMDD-XXX] skill_or_command_name

**Logged**: ISO-8601 timestamp
**Priority**: high
**Status**: pending
**Area**: frontend | backend | infra | tests | docs | config

### Summary
Brief description of what failed

### Error
```
Actual error message or output
```

### Context
- Command/operation attempted
- Input or parameters used
- Environment details if relevant
- Summary or redacted excerpt of relevant output (avoid full transcripts and secret-bearing data by default)

### Suggested Fix
If identifiable, what might resolve this

### Metadata
- Reproducible: yes | no | unknown
- Related Files: path/to/file.ext
- See Also: ERR-20250110-001 (if recurring)
- Pattern-Key: area.symptom (recommended; e.g. net.connection-refused — see Pattern-Key Taxonomy)
- Recurrence-Count: 1 (optional)
- First-Seen: 2025-01-15 (optional)
- Last-Seen: 2025-01-15 (optional)

---
```

### Feature Request Entry

Append to `.learnings/FEATURE_REQUESTS.md`:

```markdown
## [FEAT-YYYYMMDD-XXX] capability_name

**Logged**: ISO-8601 timestamp
**Priority**: medium
**Status**: pending
**Area**: frontend | backend | infra | tests | docs | config

### Requested Capability
What the user wanted to do

### User Context
Why they needed it, what problem they're solving

### Complexity Estimate
simple | medium | complex

### Suggested Implementation
How this could be built, what it might extend

### Metadata
- Frequency: first_time | recurring
- Related Features: existing_feature_name
- Pattern-Key: area.symptom (optional — features usually dedupe by capability name; use a key only for recurring themes, e.g. api.missing-endpoint)

---
```

## ID Generation

Format: `TYPE-YYYYMMDD-XXX`
- TYPE: `LRN` (learning), `ERR` (error), `FEAT` (feature)
- YYYYMMDD: Current date
- XXX: Sequential number or random 3 chars (e.g., `001`, `A7B`)

Examples: `LRN-20250115-001`, `ERR-20250115-A3F`, `FEAT-20250115-002`

## Resolving Entries

When an issue is fixed, update the entry:

1. Change `**Status**: pending` → `**Status**: resolved`
2. Add resolution block after Metadata:

```markdown
### Resolution
- **Resolved**: 2025-01-16T09:00:00Z
- **Commit/PR**: abc123 or #42
- **Notes**: Brief description of what was done
```

Other status values:
- `in_progress` - Actively being worked on
- `wont_fix` - Decided not to address (add reason in Resolution notes)
- `promoted` - Elevated to CLAUDE.md (project or global)

## Promoting to CLAUDE.md

When a learning is broadly applicable (not a one-off fix), promote it so every future session inherits it without reading `.learnings/`.

### When to Promote

- Learning applies across multiple files/features
- Knowledge any contributor (human or AI) should know
- Prevents recurring mistakes
- Documents project-specific conventions

### Promotion Targets

| Target | What Belongs There |
|--------|-------------------|
| Project `CLAUDE.md` (repo root) | Project-specific conventions, workflows, tool gotchas for this repo |
| Global `~/.claude/CLAUDE.md` | Cross-project conventions and tool behavior that hold everywhere |

### How to Promote

1. **Distill** the learning into a concise rule or fact
2. **Add** to the matching section of the target CLAUDE.md — in this project, place it in the existing structure (信息索引 table row, 叙事与表述约定, 武器耐久, etc.); do not append an unstructured block at the end
3. **Update** original entry:
   - Change `**Status**: pending` → `**Status**: promoted`
   - Add `**Promoted**: CLAUDE.md (project)` or `**Promoted**: CLAUDE.md (global)`

### Promotion Examples

**Learning** (verbose):
> Project uses pnpm workspaces. Attempted `npm install` but failed.
> Lock file is `pnpm-lock.yaml`. Must use `pnpm install`.

**In global CLAUDE.md** (concise):
```markdown
## Build & Dependencies
- Package manager: pnpm (not npm) - use `pnpm install`
```

**Learning** (verbose):
> When modifying API endpoints, must regenerate TypeScript client.
> Forgetting this causes type mismatches at runtime.

**In project CLAUDE.md** (actionable):
```markdown
## After API Changes
1. Regenerate client: `pnpm run generate:api`
2. Check for type errors: `pnpm tsc --noEmit`
```

## Pattern-Key Taxonomy

`Pattern-Key` is the stable dedup and recurrence key for entries in all three
log files: keyword grep misses semantically identical but differently-worded
entries, a shared key does not — and reliable keys are what make
`Recurrence-Count` and the promotion rule work.

**Format**: `area.symptom` — exactly two levels, lowercase, hyphenated
(e.g. `deps.module-not-found`). Keep symptoms generic enough to recur: no
file names, versions, or hostnames in keys.

| Area | Scope | Example Keys |
|------|-------|--------------|
| `api` | External API/service behavior | `api.rate-limit`, `api.schema-mismatch`, `api.missing-endpoint` |
| `auth` | Credentials, tokens, scopes | `auth.token-expired`, `auth.missing-scope` |
| `build` | Compilation, bundling, CI | `build.type-error`, `build.missing-artifact` |
| `config` | Config files, env vars, settings | `config.missing-env`, `config.invalid-json` |
| `deps` | Package managers, dependencies | `deps.module-not-found`, `deps.npm-error`, `deps.version-conflict` |
| `fs` | Filesystem | `fs.no-such-file`, `fs.permission-denied` |
| `net` | Network connectivity | `net.connection-refused`, `net.timeout` |
| `runtime` | Language/runtime errors not covered above | `runtime.type-error`, `runtime.python-exception` |
| `shell` | Shell/CLI mechanics | `shell.command-not-found`, `shell.nonzero-exit` |
| `vcs` | Git and other version control | `vcs.fatal-error`, `vcs.merge-conflict` |

**Rules:**

1. **Reuse before minting**: `grep -rh "Pattern-Key:" .learnings/ | sort -u` —
   a near-match beats a new key.
2. **One key per entry** — reduce to one during triage if somehow more.
3. **Mint new areas sparingly** — only when several entries would share one.
4. **Generic sweep keys** (`runtime.error`, `runtime.failure`) mean
   "unclassified" — replace with a specific key during triage.

## Recurring Pattern Detection

If logging something similar to an existing entry:

1. **Search by key first**: `grep -n "Pattern-Key: area.symptom" .learnings/*.md`
   — this is the default dedup check and catches rewordings that keyword
   search misses
2. **Fallback keyword search**: `grep -ri "keyword" .learnings/` for entries
   logged without a key
3. **Fold, don't duplicate**: on a hit, update the existing entry — bump
   `Recurrence-Count`, set `Last-Seen`, add `**See Also**` — instead of
   creating a new one
4. **Bump priority** if issue keeps recurring
5. **Consider systemic fix**: Recurring issues often indicate:
   - Missing knowledge (→ promote to CLAUDE.md)
   - Missing automation (→ add a tool/check to the workflow section of CLAUDE.md or a project skill)
   - Architectural problem (→ create tech debt ticket)

## Periodic Review

Review `.learnings/` at natural breakpoints:

### When to Review
- Before starting a new major task
- After completing a feature
- When working in an area with past learnings
- Weekly during active development

### Quick Status Check
(on Windows run via the Bash tool / Git Bash)

```bash
# Count pending items
grep -h "Status\*\*: pending" .learnings/*.md | wc -l

# List pending high-priority items
grep -B5 "Priority\*\*: high" .learnings/*.md | grep "^## \["

# Find learnings for a specific area
grep -l "Area\*\*: backend" .learnings/*.md
```

### Review Actions
- Resolve fixed items
- Promote applicable learnings
- Link related entries
- Escalate recurring issues

## Detection Triggers

Automatically log when you notice:

**Corrections** (→ learning with `correction` category):
- "No, that's not right..."
- "Actually, it should be..."
- "You're wrong about..."
- "That's outdated..."

**Feature Requests** (→ feature request):
- "Can you also..."
- "I wish you could..."
- "Is there a way to..."
- "Why can't you..."

**Knowledge Gaps** (→ learning with `knowledge_gap` category):
- User provides information you didn't know
- Documentation you referenced is outdated
- API behavior differs from your understanding

**Errors** (→ error entry):
- Command returns non-zero exit code
- Exception or stack trace
- Unexpected output or behavior
- Timeout or connection failure

## Priority Guidelines

| Priority | When to Use |
|----------|-------------|
| `critical` | Blocks core functionality, data loss risk, security issue |
| `high` | Significant impact, affects common workflows, recurring issue |
| `medium` | Moderate impact, workaround exists |
| `low` | Minor inconvenience, edge case, nice-to-have |

## Area Tags

Use to filter learnings by codebase region:

| Area | Scope |
|------|-------|
| `frontend` | UI, components, client-side code (here: engine.js, style.css, index.html) |
| `backend` | Data/logic layer (here: story/*.js scene data, core.js variables/rules) |
| `infra` | CI/CD, deployment, auto-push task, git |
| `tests` | tools/*.mjs, test_helper.mjs, lint/E2E workflows |
| `docs` | CLAUDE.md, 设计细节.md, 人物档案.md, skill docs |
| `config` | settings, .gitignore, hooks |

## Best Practices

1. **Log immediately** - context is freshest right after the issue
2. **Be specific** - future agents need to understand quickly
3. **Include reproduction steps** - especially for errors
4. **Link related files** - makes fixes easier
5. **Suggest concrete fixes** - not just "investigate"
6. **Use consistent categories** - enables filtering
7. **Promote aggressively** - if in doubt, add to the appropriate CLAUDE.md
8. **Review regularly** - stale learnings lose value

## Gitignore Options

**Keep learnings local** (current setup — this repo's AutoPushGame task runs
`git add -A` and pushes hourly, so gitignoring is what keeps local logs local):
```gitignore
.learnings/
```

**Track learnings in repo** (team-wide): remove from .gitignore — learnings
become shared knowledge.

**Hybrid** (track templates, ignore entries):
```gitignore
.learnings/*.md
!.learnings/.gitkeep
```

## Upgrading & Uninstalling

Read `CHANGELOG.md` before upgrading — it carries per-version notes.
Upstream installs target OpenClaw paths; copying upstream SKILL.md over this
one reverts the Claude Code adaptation (see the notice at the top) — re-apply.
To disable or remove the skill, follow `references/uninstall.md`:
`.learnings/` is user data (review before deleting), and content promoted to
CLAUDE.md stays until removed manually.

## Automatic Skill Extraction

When a learning is valuable enough to become a reusable skill, extract it.

### Skill Extraction Criteria

A learning qualifies for skill extraction when ANY of these apply:

| Criterion | Description |
|-----------|-------------|
| **Recurring** | Has `See Also` links to 2+ similar issues |
| **Verified** | Status is `resolved` with working fix |
| **Non-obvious** | Required actual debugging/investigation to discover |
| **Broadly applicable** | Not project-specific; useful across codebases |
| **User-flagged** | User says "save this as a skill" or similar |

### Extraction Workflow

1. **Identify candidate**: Learning meets extraction criteria
2. **Run helper** (or create manually):
   ```bash
   .claude/skills/self-improving-agent/scripts/extract-skill.sh skill-name --dry-run
   .claude/skills/self-improving-agent/scripts/extract-skill.sh skill-name
   ```
3. **Customize SKILL.md**: Fill in template with learning content — follow superpowers:writing-skills conventions for skill authoring
4. **Update learning**: Set status to `promoted_to_skill`, add `Skill-Path`
5. **Verify**: Read skill in fresh session to ensure it's self-contained

### Manual Extraction

If you prefer manual creation:

1. Create `.claude/skills/<skill-name>/SKILL.md` (project) or `~/.claude/skills/<skill-name>/SKILL.md` (personal)
2. Use template from `assets/SKILL-TEMPLATE.md`
3. Follow [Agent Skills spec](https://agentskills.io/specification):
   - YAML frontmatter with `name` and `description`
   - Name must match folder name
   - No README.md inside skill folder

### Extraction Detection Triggers

Watch for these signals that a learning should become a skill:

**In conversation:**
- "Save this as a skill"
- "I keep running into this"
- "This would be useful for other projects"
- "Remember this pattern"

**In learning entries:**
- Multiple `See Also` links (recurring issue)
- High priority + resolved status
- Category: `best_practice` with broad applicability
- User feedback praising the solution

### Skill Quality Gates

Before extraction, verify:

- [ ] Solution is tested and working
- [ ] Description is clear without original context
- [ ] Code examples are self-contained
- [ ] No project-specific hardcoded values
- [ ] Follows skill naming conventions (lowercase, hyphens)
