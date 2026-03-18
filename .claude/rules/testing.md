# Testing

- Prefer concrete validation over speculative coverage claims.
- For app code changes, a `tsc --noEmit` run from `mobile/` is the baseline check when feasible.
- Add narrow tests around real behavior instead of broad snapshots when the harness allows it.
- If the current repo does not support automated coverage for a slice, document the validation gap explicitly.
- Native or device-integration changes usually need both code-level validation and a manual verification note.
