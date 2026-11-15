---
name: brand-design-system
description: "Apply this project's warm, Allbirds-inspired design system with primary color #C1AA70 when creating or changing pages, UI components, layouts, visual states, or theme tokens. Use for brand consistency reviews and design-system updates; backend-only work does not need this skill."
---

# Brand Design System

Use [references/DESIGN.md](references/DESIGN.md) as the authoritative visual
specification for this project. Read it before choosing colors, typography,
spacing, component shapes, or interaction states.

## Apply the system

1. Inspect the affected UI and existing theme/component definitions. Keep the
   user's requested scope: a documentation task does not authorize an app-wide
   restyle, and a single component change does not require a new showcase page.
2. Read the specification's foundations and the component guidance relevant to
   the task. Treat the supplied Allbirds extraction as inspiration; the adapted
   specification resolves its conflicting measurements and defines project rules.
3. For shadcn work, also use the project's `shadcn` skill for component APIs and
   composition. Apply this specification through semantic theme variables in the
   existing global stylesheet and shared component variants. Preserve the project's
   configured component library and unrelated styling.
4. Keep the exact primary color. Use the specified foreground, hover, link, input,
   focus, and status roles rather than recoloring every dark element gold. Keep
   headings readable, feedback distinguishable, and focus visible in each theme.
5. Use the typography already available in the project unless font installation
   is part of the request. The source's commercial font names are visual references,
   not bundled assets or evidence of a license.

## Verify UI changes

Check the affected layout at mobile and desktop widths, keyboard focus, hover,
disabled and validation states, and supported light/dark themes. Check actual
foreground/background combinations against the specification's contrast criteria.
Use the repository's applicable lint, type, and build checks when changing code.
For documentation-only changes, validate the skill, its links, and token coherence.

The skill is complete when the requested output uses the adapted specification
and any deviations are identified. It does not authorize unrelated component
installation, preset replacement, database changes, or publication.
