---
description: Run a release-readiness or verification pass for the DayOS app or workspace docs/config package.
---

# release-check

Workflow:
1. Confirm target scope: workspace, `mobile/`, or both.
2. Check git status, relevant metadata, and validation commands for that scope.
3. Report pass, warn, or block items only.

Output:
- scope checked
- commands run
- blockers and residual risks
