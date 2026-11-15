---
name: daisyui
description: Use daisyUI and Tailwind CSS for accessible, consistent React interface components in this workspace. Apply when adding or changing frontend UI with daisyUI.
---

# daisyUI workspace skill

Use this skill when a task explicitly calls for daisyUI or when daisyUI is already part of the approved frontend implementation. This repository currently uses React, TypeScript, and Vite; its foundation does not yet install Tailwind CSS or daisyUI. Do not add dependencies or migrate styling as speculative setup.

## Before implementation

1. Read the current frontend source and `frontend/package.json` to identify its existing styling and build setup.
2. For a task that requires daisyUI, add the minimum compatible Tailwind CSS and daisyUI packages using the repository's npm workflow, then update the lockfile. Confirm the current integration steps in the official [daisyUI install docs](https://daisyui.com/docs/install/) and [Tailwind CSS docs](https://tailwindcss.com/docs).
3. daisyUI v5's documented Tailwind CSS v4 setup imports Tailwind and registers daisyUI in CSS:

   ```css
   @import "tailwindcss";
   @plugin "daisyui";
   ```

   Check current docs and project compatibility before applying this pattern; do not use v4 instructions blindly in a different major version.

## Component and styling practices

- Prefer daisyUI semantic component classes for common controls and surfaces (`btn`, `card`, `alert`, `badge`, `table`, and form controls) where they fit. Use Tailwind utilities for layout and small local adjustments.
- Keep React components typed, focused, and composed from accessible HTML elements. Use real labels, visible focus states, keyboard-operable controls, and meaningful status text; do not rely on color alone.
- Use daisyUI theme tokens such as `primary`, `base-100`, and `base-content` rather than hard-coded palette colors for theme-aware UI. Define or enable only the themes the task needs. See [theme configuration](https://daisyui.com/docs/themes/).
- Avoid broad custom CSS overrides that fight the component system. Put reusable design choices in the shared theme or focused component styles; do not add a second component library for the same controls without an explicit reason.
- Keep charts, maps, and scientific visualizations legible and honest. Preserve units, provenance, quality/exclusion states, and uncertainty where the contract supplies them. Do not use styling or labels to turn association into causation, imply groundwater depletion from SAR backscatter, or present planned/unverified data as results.
- Ensure loading, empty, error, and unavailable-data states are distinguishable and understandable.

## Validation

- Run the relevant frontend checks for the change (`npm run check` and `npm run build` from `frontend/`) when implementation is requested.
- Review keyboard access, focus visibility, contrast, responsive behavior, and light/dark theme behavior when applicable. Automated checks do not establish scientific validity.

## References

- [daisyUI installation](https://daisyui.com/docs/install/)
- [daisyUI components](https://daisyui.com/components/)
- [daisyUI themes](https://daisyui.com/docs/themes/)
- [Tailwind CSS documentation](https://tailwindcss.com/docs)
