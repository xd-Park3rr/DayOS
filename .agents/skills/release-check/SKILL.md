# Release Check

Use this skill for release-readiness, validation checklists, or repo-health checks.

## Procedure

1. Confirm whether the target is the top-level workspace, `mobile/`, or both.
2. Prefer concrete checks: Git status, package metadata, TypeScript validation, manual drift, and native dependency review.
3. Keep blockers explicit instead of assuming release scope.

## Return

- A checklist with pass, warn, or block outcomes.
- Commands run and repo scope used.
- Remaining blockers or manual verification gaps.
