# UI Patterns

- Keep navigation aligned with `mobile/App.tsx`.
- Preserve the current mobile visual language unless the task explicitly asks for redesign.
- Prefer local `StyleSheet.create` styles and existing font usage over introducing a new styling system.
- Keep screen components focused on rendering and user interaction; move device side effects into services.
- Check both the target screen and shared components before duplicating UI logic.
