---
name: Modern Warm Gold
version: 1
primary: "#C1AA70"
provenance:
  reference: "User-supplied allbirds.DESIGN.md"
  source_brand: "Allbirds"
  adaptation: "Project palette, accessible color roles, coherent components and responsive rules"
brand:
  50: "#F8F5EC"
  100: "#F0E9D6"
  200: "#E1D2AE"
  300: "#D1BE8D"
  400: "#C1AA70"
  500: "#AC9357"
  600: "#8A733C"
  700: "#6F5B2D"
  800: "#534321"
  900: "#352B18"
  950: "#211C12"
themes:
  light:
    background: "#F7F5EF"
    foreground: "#211F1A"
    card: "#FFFFFF"
    card-foreground: "#211F1A"
    popover: "#FFFFFF"
    popover-foreground: "#211F1A"
    primary: "#C1AA70"
    primary-foreground: "#211F1A"
    primary-hover: "#B39A5C"
    primary-active: "#A88E50"
    secondary: "#ECE9E2"
    secondary-foreground: "#211F1A"
    muted: "#ECE9E2"
    muted-foreground: "#59564E"
    accent: "#F0E9D6"
    accent-foreground: "#534321"
    border: "#D8D2C5"
    input: "#8F8572"
    ring: "#6F5B2D"
    link: "#6F5B2D"
    link-hover: "#534321"
    destructive: "#A13232"
    destructive-foreground: "#FFFFFF"
    success: "#2F6848"
    warning: "#785719"
    info: "#315F7A"
    inverse: "#211F1A"
    inverse-foreground: "#F7F5EF"
    chart-1: "#6F5B2D"
    chart-2: "#2F6848"
    chart-3: "#315F7A"
    chart-4: "#8A4C62"
    chart-5: "#59564E"
  dark:
    background: "#171612"
    foreground: "#F7F5EF"
    card: "#211F1A"
    card-foreground: "#F7F5EF"
    popover: "#2C281F"
    popover-foreground: "#F7F5EF"
    primary: "#C1AA70"
    primary-foreground: "#211F1A"
    primary-hover: "#B39A5C"
    primary-active: "#A88E50"
    secondary: "#2C281F"
    secondary-foreground: "#F7F5EF"
    muted: "#2C281F"
    muted-foreground: "#BEB7A7"
    accent: "#352B18"
    accent-foreground: "#E1D2AE"
    border: "#4B4537"
    input: "#9D927C"
    ring: "#C1AA70"
    link: "#D1BE8D"
    link-hover: "#E1D2AE"
    destructive: "#F08E88"
    destructive-foreground: "#211F1A"
    success: "#8EC9A2"
    warning: "#E5C477"
    info: "#91BBD4"
    inverse: "#F7F5EF"
    inverse-foreground: "#211F1A"
    chart-1: "#C1AA70"
    chart-2: "#8EC9A2"
    chart-3: "#91BBD4"
    chart-4: "#D6A0B4"
    chart-5: "#BEB7A7"
geometry:
  radius-none: "0px"
  radius-xs: "4px"
  radius-sm: "6px"
  radius-full: "9999px"
  border-width: "1px"
  control-height: "48px"
  compact-control-height: "40px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  xxl: "28px"
  xxxl: "32px"
  section: "36px"
  band: "40px"
shadows:
  sm: "0 1px 3px rgb(33 31 26 / 0.10), 0 1px 2px rgb(33 31 26 / 0.06)"
  md: "0 10px 15px -3px rgb(33 31 26 / 0.10), 0 4px 6px -4px rgb(33 31 26 / 0.08)"
  lg: "0 20px 25px -5px rgb(33 31 26 / 0.12), 0 8px 10px -6px rgb(33 31 26 / 0.08)"
motion:
  fast: "150ms"
  standard: "200ms"
  easing: "ease-out"
---

# Modern Warm Gold Design System

## Intent and authority

Keep the supplied reference's natural materials, generous whitespace, quiet
typography, honest product imagery, flat color blocks, and restrained elevation.
Warm gold is the project's brand accent. Charcoal remains the main text color;
cream and linen remain the dominant surfaces. Let photography carry visual weight.

This is an adaptation, not a claim about Allbirds' current brand guidelines.
The supplied extraction contained contradictory radii, impossible numeric values,
incomplete states, and uncertain font availability. This document replaces those
ambiguities with deliberate project decisions. Its frontmatter is the token source
of truth; the original extraction is historical reference only.

## Color roles and contrast

Use `primary` for the main action, selected emphasis, and controlled brand accents.
Use `primary-foreground` for text and icons on gold. Use `accent` for quiet selected
backgrounds, `secondary` for neutral supporting actions, and `muted` for subdued
surfaces. The brand ramp supports illustrations and tonal backgrounds; its steps
are not automatically valid text colors.

Measured sRGB contrast ratios, displayed to two decimals:

| Foreground / background | Ratio | Application |
| --- | --- | --- |
| Light primary-foreground / primary | 7.25:1 | Primary button labels |
| Light primary-foreground / primary-hover | 6.03:1 | Hover labels |
| Light primary-foreground / primary-active | 5.21:1 | Pressed labels |
| White / primary | 2.27:1 | Fails text contrast; use the dark foreground |
| Light link / background | 6.00:1 | Inline links on cream |
| Light muted-foreground / background | 6.72:1 | Secondary copy |
| Light input / card | 3.64:1 | Field boundary on white |
| Light primary / background | 2.08:1 | Decorative accent, insufficient as a lone control indicator |
| Dark primary / background | 7.98:1 | Brand emphasis on dark canvas |

Maintain at least 4.5:1 for normal text, 3:1 for large text, and 3:1 for visual
cues required to identify controls or their states against adjacent colors.
Use the stronger normal-text target for small labels and placeholder text.
See W3C's [text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
and [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
guidance. These pair checks do not certify an entire page.

On light surfaces, use `link` for readable gold-family text, `ring` for focus, and
`input` for meaningful control outlines. A gold-only check, outline, or active
underline on cream is insufficient: add a contrasting indicator, darker outline,
or an appropriately colored checkmark. Distinguish selected navigation with text
weight and a contrasting underline. Labels can identify filled gold buttons;
use the contrasting border role if their boundary must also convey information.

Use destructive, success, warning, and info roles with text or icons that explain
the result. Gold is a brand color, not the warning signal. Use status foregrounds
on neutral surfaces, or pair destructive fills with destructive-foreground. For
additional tinted feedback surfaces, verify the final text/background pair first.

Dark mode is a designed extension, not an observed source theme. Use its semantic
roles consistently. Keep primary gold unchanged across themes. Distinguish dark
surfaces by their fill and border rather than stronger shadows.

## Typography

Use the existing Geist font for UI and headings, with the system sans-serif stack
as fallback; use Geist Mono for code. The reference's Geograph, Self Modern, and
Akkurat Mono names describe inspiration only. Introduce licensed font files only
when supplied and requested. Use a suitable project-approved Arabic font and
locale-aware fallback if Arabic UI is implemented; Latin Geist is not sufficient
evidence of Arabic glyph coverage.

| Role | Size | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- |
| Display | 30px mobile, 40px desktop | 400 | 1.2 | 0 |
| Section heading | 24px | 500 | 1.33 | 0 |
| Eyebrow | 12px | 500 | 1.33 | 0.6px |
| Lead | 20px | 400 | 1.4 | 0 |
| Body | 16px | 400 | 1.5 | 0 |
| Supporting text | 14px | 400 | 1.43 | 0 |
| Caption | 12px | 400 | 1.33 | 0 |
| Button | 14px | 500 | 1.43 | 0.6px |
| Large button | 16px | 500 | 1.5 | 0.8px |
| Field label / input | 16px | 400 or 500 | 1.5 | 0 |
| Code | 14px | 400 | 1.5 | 0 |

Favor weights 400 and 500; reserve 700 for rare strong emphasis. Use uppercase
only for short Latin button labels and eyebrows. Preserve sentence case for
body text, form labels, and code. Use natural script casing and zero added letter
spacing for Arabic. Use logical spacing and alignment properties for RTL layouts.

## Layout, geometry, and elevation

Use the named spacing scale in frontmatter. Card padding is 20-24px, component
gaps 8-16px, and section separation 36-40px or multiples of those tokens for heroes.
Keep reading columns near 65 characters and the page container at most 1420px.
Use 16px horizontal gutters on mobile, 24px from 768px, and 40px from 1024px.
Full-bleed imagery can sit outside the text container.

Product grids use two columns on mobile, three from 768px, and four from 1024px
when content allows; use one column for detailed cards on narrow screens. The
source's four/seven-column measurements are not required product-card counts.
Collapse primary navigation below 1024px, stack forms and footer columns on
mobile, and keep dialogs within the viewport with internal scrolling as needed.
At 320px and at 200% zoom, content must remain usable without page-level horizontal
overflow; wide data tables can have their own labeled scroll region.

Use sharp corners for images and editorial cards. Primary and secondary buttons
use the small 6px radius; inputs and selects use the full pill radius consistently,
including focus. Small chips may also use the full radius. Dialogs and popovers
use 6px. These are intentional resolutions of the source's conflicting shapes.

Base content and standard cards stay flat. Use micro elevation for floating
elements, medium elevation for dropdowns, and large elevation for dialogs. Let
the existing overlay primitives manage stacking and focus containment.

## Component treatments

| Component | Default | Interaction |
| --- | --- | --- |
| Primary button | primary fill, primary-foreground label, 6px radius, 48px minimum height, 16-24px horizontal padding | primary-hover then primary-active fill; persistent legible label |
| Secondary button | secondary fill and secondary-foreground label, same geometry | accent fill and accent-foreground label on hover |
| Outline button | transparent fill, foreground label, input border | accent fill; keep a contrasting boundary |
| Destructive button | destructive fill and destructive-foreground label | retain this pair; use outline/underline feedback rather than an unchecked color blend |
| Text action / link | link color and underline in body copy | link-hover color; underline on hover and focus |
| Input / select | card fill, foreground text, input border, pill radius, 48px minimum height, 12px 16px padding | ring on focus; destructive border and explanatory text on error |
| Product card | neutral or card surface, sharp image, sharp outer shape | underline title or apply subtle micro elevation; maintain visible content |
| Dialog / popover | popover surface, matching foreground, 6px radius | visible title, accessible close control, managed focus |
| Header | background surface or verified image overlay; foreground text | active marker uses contrast-safe color and shape |
| Footer | charcoal surface using light inverse and inverse-foreground roles | gold accents; inverse-foreground links with underlines |

Footer charcoal is an intentional fixed brand surface. In dark mode it can use
the dark card surface and its foreground; changing themes must preserve contrast.
Use the inverse pair for other deliberately inverted sections and actions.

For checkbox/radio/toggle selection on light surfaces, use `ring` as the selected
fill with white marks, or a gold fill with dark marks plus an `input` outline.
Validate the boundary and internal mark separately. On dark surfaces, gold fills
with primary-foreground marks are suitable. Keep meaningful icons consistent with
the text color role. Status badges include a readable label, not only a colored dot.

Provide a visible 2px focus outline with a 2px surface-colored offset. Use the
theme's `ring`; an offset separates it from the control fill. Use a dark ring on
gold or pale surfaces and a gold ring on dark surfaces. Disabled controls retain
their shape and label, use a distinct muted treatment, and expose disabled semantics.
Use a spinner plus stable label for pending actions to avoid layout shift.

Use 48px targets for primary touch controls and icon buttons. Compact 40px
controls suit dense pointer-oriented UI; provide sufficient surrounding target
space on touch surfaces. Error messages remain next to their associated fields.

## Motion and imagery

Use the motion tokens for color, border, and small opacity transitions. Keep
controls and essential card content visible throughout hover and focus. For
reduced motion, remove movement and use immediate or minimal color feedback.
The extracted zero-opacity states, extreme radii, and 3D flips are not defaults.

Prefer natural materials, honest product proportions, soft light, and uncluttered
backgrounds. Use flat cream, linen, gold, and charcoal sections instead of
decorative gradients. Place text beside busy imagery or use a verified solid
overlay when over-image text is required. Use the project's own identity and assets.

## shadcn / Tailwind integration

When implementing this system, map theme keys to matching CSS custom properties
in the existing global stylesheet's `:root` and `.dark` blocks. Preserve the existing
Tailwind v4 `@theme inline` aliases. Add aliases for custom semantic roles such as
primary-hover, primary-active, link, inverse, success, warning, and info when used.
Use utilities such as `bg-primary`, `text-primary-foreground`, and `text-link`.
Keep custom brand treatments in shared variants rather than repeating literal hex
values across page markup. Prefer a defined hover token over unverified opacity
mixes such as `primary/90`.

Map sidebar background/foreground to card/card-foreground, sidebar-primary to
primary/primary-foreground, sidebar-accent to accent/accent-foreground, and sidebar
border/ring to their matching roles. Chart tokens are categorical starting colors:
add labels, patterns, or markers and test adjacent series; a palette alone does
not establish accessible chart contrast.

Pin component radii explicitly: a single shadcn base radius cannot represent both
sharp cards and pill inputs. Apply typography and control sizes through shared
definitions. Use the current component primitives and APIs; this specification
does not select a new preset, require installation of all components, or require
building a design-system page as part of unrelated UI work.
