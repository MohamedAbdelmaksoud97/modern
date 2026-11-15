---
version: alpha
name: Allbirds
description: |
  Allbirds' design system embodies understated comfort and sustainable
  simplicity. The visual language prioritizes clean, minimalist aesthetics with
  a focus on natural materials and honest product presentation. The palette
  relies on warm neutrals, deep charcoals, and off-whites that evoke natural
  fiber and organic textures. Typography is deliberately restrained, using
  geometric sans-serifs with generous spacing to create breathing room. The
  overall mood is approachable and grounded—emphasizing the sensory comfort of
  wearing natural shoes rather than aspirational luxury. Depth comes primarily
  from color blocking and subtle micro-shadows rather than dramatic layering,
  reinforcing the brand's commitment to clarity and authenticity.
source:
  url: "https://allbirds.com"
  pagesAnalyzed: 1
  extractedAt: 2026-11-03
  tokensMeasured: true
colors:
  primary: "#212121"
  canvas: "#ECE9E2"
  on-primary: "#FFFFFF"
  ink: "#000000"
  body: "#575757"
  muted: "#FFFFFF"
typography:
  display:
    fontFamily: "Self Modern"
    fontSize: 40px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  heading-sm:
    fontFamily: Geograph
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: 0.6px
  heading-sm-strong:
    fontFamily: Geograph
    fontSize: 24px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0px
  heading-xs:
    fontFamily: Geograph
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: 0px
    textTransform: uppercase
  body-xl:
    fontFamily: Geograph
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0px
  body-lg:
    fontFamily: Geograph
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: 0.7px
  body-lg-tight:
    fontFamily: Geograph
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  body-lg-2:
    fontFamily: Geograph
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: 0px
  body-lg-strong:
    fontFamily: Geograph
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.43
    letterSpacing: 0.7px
    textTransform: uppercase
  body-md:
    fontFamily: Geograph
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: 0px
  button-md:
    fontFamily: Geograph
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0.8px
    textTransform: uppercase
  button-sm:
    fontFamily: Geograph
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: 0.6px
    textTransform: uppercase
  button-sm-strong:
    fontFamily: Geograph
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: 0.3px
    textTransform: uppercase
  label:
    fontFamily: Geograph
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0px
  caption-xs:
    fontFamily: Geograph
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: 0.6px
  caption-xs-strong:
    fontFamily: Geograph
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: 0.3px
    textTransform: uppercase
  caption-xs-uppercase:
    fontFamily: Geograph
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.6px
    textTransform: uppercase
  code-md:
    fontFamily: "Akkurat Mono"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0.8px
    textTransform: uppercase
  code-sm:
    fontFamily: "Akkurat Mono"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: 1.2px
    textTransform: uppercase
  code-sm-tight:
    fontFamily: "Akkurat Mono"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.33
    letterSpacing: 0.6px
    textTransform: uppercase
  code-sm-strong:
    fontFamily: "Akkurat Mono"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.67
    letterSpacing: 1.2px
    textTransform: uppercase
rounded:
  none: 0px
  xs: 4px
  sm: 6px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 28px
  xxxl: 32px
  section: 36px
  band: 40px
borderWidths:
  thin: 1px
shadows:
  sm: "rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.1) 0px 1px 2px -1px"
  md: "rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.1) 0px 4px 6px -4px"
  lg: "rgba(0, 0, 0, 0.1) 0px 20px 25px -5px, rgba(0, 0, 0, 0.1) 0px 8px 10px -6px"
elevationStrategy: layered-micro
themes:
  derived: dark   # the other theme is the site's measured palette
  light:
    bg: "#ECE9E2"
    surface: "#E5E2DB"
    surfaceRaised: "#DCD9D2"
    text: "#000000"
    textMuted: "#575757"
    border: "#D0CDC7"
    accent: "#212121"
    accentFg: "#FFFFFF"
    focusRing: "#212121"
    elevation: shadow
  dark:
    bg: "#0F0F10"
    surface: "#1D1D1E"
    surfaceRaised: "#29292A"
    text: "#F6F6F6"
    textMuted: "#9E9E9F"
    border: "#353536"
    accent: "#7D7D7D"
    accentFg: "#0B0B0C"
    focusRing: "#686868"
    elevation: "border+surface"
components:
  button-primary:
    typography: "{typography.caption-xs-strong}"
    backgroundColor: "{colors.primary}"
    textColor: "{colors.muted}"
    padding: "8px 16px 8px 16px"
    rounded: "3.35544e+07px"
    border: "1px solid {colors.primary}"
    height: 33px
  button-primary-lg:
    typography: "{typography.button-md}"
    backgroundColor: "{colors.primary}"
    textColor: "{colors.muted}"
    padding: "12px 0px 12px 0px"
    rounded: "{rounded.sm}"
    height: 48px
  button-filled:
    typography: "{typography.caption-xs-strong}"
    backgroundColor: "{colors.on-primary}"
    textColor: "{colors.primary}"
    padding: "8px 16px 8px 16px"
    rounded: "3.35544e+07px"
    border: "1px solid {colors.on-primary}"
    height: 33px
  button-outline:
    typography: "{typography.caption-xs-strong}"
    textColor: "{colors.muted}"
    padding: "8px 16px 8px 16px"
    rounded: "3.35544e+07px"
    border: "1px solid {colors.on-primary}"
    height: 33px
  button-text:
    typography: "{typography.button-md}"
    textColor: "{colors.primary}"
    height: 48px
  button-text-sm:
    typography: "{typography.heading-xs}"
    textColor: "{colors.primary}"
    height: 16px
  footer:
    typography: "{typography.button-md}"
    backgroundColor: "{colors.primary}"
    textColor: "{colors.muted}"
    padding: "80px 40px 20px 40px"
  link:
    typography: "{typography.button-md}"
    textColor: "{colors.ink}"
    rounded: "16px 16px 0px 0px"
  link-sm:
    typography: "{typography.button-md}"
    textColor: "{colors.ink}"
states:
  button-disabled:
    target: button
    state: disabled
    opacity: 0.7
  other-hover:
    target: other
    state: hover
    opacity: 1
  other-active:
    target: other
    state: active
    opacity: 0.85
  other-disabled:
    target: other
    state: disabled
    opacity: 0.4
  button-hover:
    target: button
    state: hover
    opacity: 0
  input-focus:
    target: input
    state: focus
    rounded: "3.40282e+38px"
  link-hover:
    target: link
    state: hover
    textDecoration: underline
  card-hover:
    target: card
    state: hover
    opacity: 0
    transform: "perspective(600px) translateY(-50%) rotateX(90deg)"
breakpoints:
  - width: 375
    containerWidth: 355
    gridColumns: 4
    navLinksVisible: 2
    menuToggleVisible: true
    headingPx: 30
    bodyPx: 16
    sectionPaddingX: 0
  - width: 768
    containerWidth: 748
    gridColumns: 7
    navLinksVisible: 2
    menuToggleVisible: true
    headingPx: 40
    bodyPx: 16
    sectionPaddingX: 0
  - width: 1024
    containerWidth: 1004
    gridColumns: 7
    navLinksVisible: 4
    menuToggleVisible: false
    headingPx: 40
    bodyPx: 16
    sectionPaddingX: 0
  - width: 1280
    containerWidth: 1260
    gridColumns: 7
    navLinksVisible: 4
    menuToggleVisible: false
    headingPx: 40
    bodyPx: 16
    sectionPaddingX: 0
  - width: 1440
    containerWidth: 1420
    gridColumns: 7
    navLinksVisible: 4
    menuToggleVisible: false
    headingPx: 40
    bodyPx: 16
    sectionPaddingX: 0
coverage:
  stylesheetsBlocked: true
  responsiveMeasured: true
  archetypesDetected: 0
  archetypesUnnamed: 0
  statesFound: 49
  gradientsFound: 0
  semanticRampDeclared: false
  rolesUnassigned: 0
---

# Design System Inspired by Allbirds

## 1. Visual Theme & Atmosphere

Allbirds' design system embodies understated comfort and sustainable simplicity. The visual language prioritizes clean, minimalist aesthetics with a focus on natural materials and honest product presentation. The palette relies on warm neutrals, deep charcoals, and off-whites that evoke natural fiber and organic textures. Typography is deliberately restrained, using geometric sans-serifs with generous spacing to create breathing room. The overall mood is approachable and grounded—emphasizing the sensory comfort of wearing natural shoes rather than aspirational luxury. Depth comes primarily from color blocking and subtle micro-shadows rather than dramatic layering, reinforcing the brand's commitment to clarity and authenticity.

**Key Characteristics**
- Warm neutral palette centered on natural tones
- Sharp, geometric buttons with pill-shaped form factor
- Minimal elevation; depth through color contrast
- Generous whitespace and breathing room
- Geograph and Self Modern fonts for clear hierarchy
- Color-blocking over decorative effects
- Focus on product imagery over graphic embellishment
- Accessibility-first interactive patterns

## 2. Color Palette & Roles

### Primary
- **Brand / Primary** (`{colors.primary}` — `#212121`): Deep charcoal used for primary CTAs, active states, brand mark, and dominant text. The system's anchor color, appearing in button fills, headings, and key interactive elements.

### Neutral Scale
- **Canvas** (`{colors.canvas}` — `#ECE9E2`): Warm off-white default page background, evoking natural linen or wool fiber. Used for main content surfaces.
- **Ink** (`{colors.ink}` — `#000000`): Pure black reserved for primary headings and the highest-contrast text elements.
- **Body** (`{colors.body}` — `#575757`): Mid-tone gray for body copy and secondary descriptive text; bridges the hierarchy between headings and muted labels.
- **Muted / On Primary** (`{colors.on-primary}` — `#FFFFFF`): White used as text and label color on brand surfaces (dark button text, captions on dark overlays). Provides contrast against `{colors.primary}`.

### Semantic / Status
No error, success, or warning colors are declared in the site's stylesheets. The design does not expose a formal semantic color ramp.

## 3. Typography Rules

### Font Families
- **Primary**: Geograph (https://fonts.googleapis.com/), sans-serif. Geometric and modern, used for all body, button, and heading text.
- **Secondary**: Self Modern (https://fonts.googleapis.com/), sans-serif. Used for display-scale headings.
- **Tertiary**: Akkurat Mono (https://fonts.googleapis.com/), monospace. Used for code and technical labels.

Fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` for all serif families; `"Courier New", monospace` for code.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|---|---|---|---|---|---|---|
| Display | Self Modern | 40px | 400 | 1.5 | 0px | Hero headlines; rarely used |
| Heading Small | Geograph | 24px | 400 | 1.33 | 0.6px | Primary section headings |
| Heading Small Strong | Geograph | 24px | 500 | 1 | 0px | Emphasized headings |
| Heading XS | Geograph | 12px | 500 | 1.33 | 0px | UPPERCASE; subsection labels |
| Body XL | Geograph | 20px | 400 | 1.4 | 0px | Large body text; promotional copy |
| Body LG | Geograph | 14px | 400 | 1.43 | 0.7px | Standard paragraph text |
| Body LG Strong | Geograph | 14px | 500 | 1.43 | 0.7px | UPPERCASE; emphasized body (labels) |
| Body LG Tight | Geograph | 14px | 400 | 1.5 | 0px | Body with tighter line spacing |
| Body LG (no spacing) | Geograph | 14px | 400 | 1.43 | 0px | Body without letter spacing |
| Body MD | Geograph | 12px | 400 | 1.33 | 0px | Smaller body text; links |
| Button MD | Geograph | 16px | 400 | 1.5 | 0.8px | UPPERCASE; large button labels |
| Button SM | Geograph | 12px | 500 | 1.33 | 0.6px | UPPERCASE; standard button labels |
| Button SM Strong | Geograph | 12px | 700 | 1.25 | 0.3px | UPPERCASE; bold button variant |
| Caption XS | Geograph | 12px | 400 | 1.33 | 0.6px | Small caption text |
| Caption XS Strong | Geograph | 12px | 500 | 1.25 | 0.3px | UPPERCASE; emphasized captions |
| Caption XS Uppercase | Geograph | 12px | 500 | 1 | 0.6px | UPPERCASE; tight captions |
| Label | Geograph | 16px | 400 | 1.5 | 0px | Form labels and input placeholders |
| Code SM | Akkurat Mono | 12px | 400 | 1.33 | 1.2px | UPPERCASE; technical small code |
| Code SM Tight | Akkurat Mono | 12px | 400 | 1.33 | 0.6px | UPPERCASE; code with tight spacing |
| Code SM Strong | Akkurat Mono | 12px | 500 | 1.67 | 1.2px | UPPERCASE; bold code variant |
| Code MD | Akkurat Mono | 16px | 500 | 1.5 | 0.8px | UPPERCASE; larger code labels |

### Principles
- **Geometric clarity**: Fonts are modern, legible at all sizes, and support strong visual hierarchy through weight and scale.
- **Tight tracking on body**: Letter spacing is consistently applied (0.6–0.8px) to create rhythm and prevent monotony in longer passages.
- **UPPERCASE for emphasis**: Accent text (buttons, labels, captions) uses uppercase to signal importance and create visual distinction.
- **Generous line height**: Body line heights (1.43–1.5) ensure readability and breathing room.
- **Weight discipline**: Only two weights commonly used (400 regular, 500 medium), with rare 700 bold for strongest emphasis; this restraint maintains clarity.

## 4. Component Stylings

### Buttons

**Primary Button**
- Background: `#212121` (`{colors.primary}`)
- Text color: `#FFFFFF` (`{colors.on-primary}`)
- Font: Geograph, `{typography.button-sm}` (12px, weight 500, letter-spacing 0.6px, UPPERCASE)
- Padding: 8px 16px
- Border radius: `{rounded.full}` (9999px, pill-shaped)
- Border: 1px solid `#212121`
- Height: 33px
- Hover: Background `#000000`, text `#FFFFFF`, border `#000000`
- Disabled: Text color `#C0C0C0`, opacity 0.7

**Primary Button Large**
- Background: `#212121` (`{colors.primary}`)
- Text color: `#FFFFFF` (`{colors.on-primary}`)
- Font: Geograph, `{typography.button-md}` (16px, weight 400, letter-spacing 0.8px, UPPERCASE)
- Padding: 12px 0px
- Border radius: `{rounded.sm}` (6px)
- Border: 0px solid `#FFFFFF`
- Height: 48px
- Hover: Background `#000000`

**Filled Button (Inverse)**
- Background: `#FFFFFF` (`{colors.on-primary}`)
- Text color: `#212121` (`{colors.primary}`)
- Font: Geograph, `{typography.button-sm}` (12px, weight 500, letter-spacing 0.6px, UPPERCASE)
- Padding: 8px 16px
- Border radius: `{rounded.full}` (9999px)
- Border: 1px solid `#FFFFFF`
- Height: 33px
- Hover: Background `#FFFFFF`, text `#212121`, border `#FFFFFF`

**Outline Button**
- Background: `rgba(0, 0, 0, 0)` (transparent)
- Text color: `#FFFFFF` (`{colors.on-primary}`)
- Font: Geograph, `{typography.button-sm}` (12px, weight 500, letter-spacing 0.6px, UPPERCASE)
- Padding: 8px 16px
- Border radius: `{rounded.full}` (9999px)
- Border: 1px solid `#FFFFFF`
- Height: 33px
- Hover: Background `#FFFFFF`, text `#212121`

**Text Button**
- Background: `rgba(0, 0, 0, 0)` (transparent)
- Text color: `#212121` (`{colors.primary}`)
- Font: Geograph, `{typography.button-md}` (16px, weight 400, letter-spacing 0.8px, UPPERCASE)
- Padding: 0px 0px
- Border radius: `{rounded.none}` (0px)
- Border: 0px solid `#212121`
- Height: 48px

**Text Button Small**
- Background: `rgba(0, 0, 0, 0)` (transparent)
- Text color: `#212121` (`{colors.primary}`)
- Font: Geograph, `{typography.button-sm}` (12px, weight 500, letter-spacing 0.6px, UPPERCASE)
- Padding: 0px 0px
- Border radius: `{rounded.none}` (0px)
- Border: 0px solid `#212121`
- Height: 16px

### Cards & Containers

**Standard Card**
- Background: `#ECE9E2` (`{colors.canvas}`)
- Border radius: `{rounded.none}` (0px, sharp edges)
- Shadow: `{shadow.sm}` — `rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.1) 0px 1px 2px -1px`
- Hover: Opacity 1.0 (cards may rotate or translate; see Known Gaps for animation specifics)

**Overlay / Modal**
- Background: `#FFFFFF` (`{colors.on-primary}`)
- Border radius: `{rounded.none}` (0px)
- Shadow: `{shadow.lg}` — `rgba(0, 0, 0, 0.1) 0px 20px 25px -5px, rgba(0, 0, 0, 0.1) 0px 8px 10px -6px`
- Text color: `#212121` (`{colors.primary}`)

### Inputs & Forms

**Text Input**
- Background: `#FFFFFF` (`{colors.on-primary}`)
- Border: 1px solid (thin)
- Border radius: `{rounded.full}` (9999px, pill-shaped)
- Font: Geograph, `{typography.label}` (16px, weight 400, line-height 1.5)
- Padding: 12px 16px (inferred from height 48px and font size)
- Height: 48px
- Focus: Border radius becomes `3.40282e+38px` (extreme pill); may show box-shadow
- Text color: `#212121` (`{colors.primary}`)

**Select Dropdown**
- Background: `#FFFFFF` (`{colors.on-primary}`)
- Border: 1px solid `#212121`
- Border radius: `{rounded.full}` (9999px)
- Font: Geograph, `{typography.label}` (16px, weight 400)
- Text color: `#212121` (`{colors.primary}`)
- Hover: Border color `#212121`

### Navigation

**Header Navigation**
- Background: Transparent or light canvas (`#ECE9E2`)
- Text color: `#212121` (`{colors.primary}`)
- Font: Geograph, `{typography.body-lg-strong}` (14px, weight 500, letter-spacing 0.7px, UPPERCASE)
- Links: Underline on hover
- Mobile menu toggle: Appears at 768px and below

**Footer**
- Background: `#212121` (`{colors.primary}`)
- Text color: `#FFFFFF` (`{colors.on-primary}`)
- Font: Geograph, `{typography.button-md}` (16px, weight 400)
- Padding: 80px 40px 20px 40px
- Links: Underline on hover; may appear as `#FFFFFF` on dark background

### Links

**Link Default**
- Color: `#212121` (`{colors.primary}`)
- Font: Geograph, `{typography.body-md}` (12px, weight 400)
- Text decoration: None
- Border radius: 16px 16px 0px 0px (unusual curved top; may apply to link containers)
- Hover: Underline; color remains `#212121`

**Link Small**
- Color: `#212121` (`{colors.primary}`)
- Font: Geograph, `{typography.body-md}` (12px, weight 400)
- Border radius: `{rounded.none}` (0px)
- Hover: Underline

## 5. Layout Principles

### Spacing System
Base unit: `{spacing.xs}` = 8px. All spacing derives from this unit:
- `{spacing.xxs}` = 4px — Micro gaps between inline elements
- `{spacing.xs}` = 8px — Small gaps, button padding vertical
- `{spacing.sm}` = 12px — Compact spacing between components
- `{spacing.md}` = 16px — Standard spacing; button padding horizontal
- `{spacing.lg}` = 20px — Component margins and section spacing
- `{spacing.xl}` = 24px — Larger section breaks
- `{spacing.xxl}` = 28px — Extra-large spacing
- `{spacing.xxxl}` = 32px — Major layout divisions
- `{spacing.section}` = 36px — Full section padding
- `{spacing.band}` = 40px — Large hero sections and footers

**Usage Context**: Body copy and cards use `{spacing.lg}` (20px) for padding. Sections separate with `{spacing.section}` to `{spacing.band}` (36–40px). Button groups use `{spacing.xs}` to `{spacing.sm}` (8–12px) gaps.

### Grid & Container
- **Max width**: 1420px content at 1440px viewport (20px margin on each side)
- **Column strategy**: 7-column layout at tablet (768px) and desktop (1024px+); 4-column at mobile (375px)
- **Container padding**: Horizontal padding varies by viewport but is typically 0px at edges (full-bleed on mobile), with margin controlled by content width
- **Section patterns**: Hero sections span full width; product grids use 2–4 columns depending on device; footer spans full width with internal grid

### Whitespace Philosophy
Whitespace is generous and deliberate. The design eschews tight packing; instead, components breathe through consistent `{spacing.lg}` and `{spacing.xl}` gaps. Sections separate with bold vertical rhythm (`{spacing.section}` to `{spacing.band}`), creating visual pauses that improve scannability. Text never crowds images; product cards feature substantial breathing room around photography.

### Border Radius Scale
- `{rounded.none}` = 0px — Images, buttons, modals, cards, and most UI elements; sharp, geometric aesthetic
- `{rounded.xs}` = 4px — Minor corner softening (rare in measured components)
- `{rounded.sm}` = 6px — Large primary buttons; subtle softness
- `{rounded.full}` = 9999px — Pill-shaped inputs and secondary buttons; creates visual softness against sharp primary elements

### Border Widths
- **Thin** = 1px — All inputs, form fields, and button borders. Used sparingly to maintain minimalist feel.

## 6. Depth & Elevation

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow; color only | Base background, text, borders |
| Micro (SM) | `rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.1) 0px 1px 2px -1px` | Cards, product tiles, subtle lift |
| Medium (MD) | `rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.1) 0px 4px 6px -4px` | Dropdowns, floating components |
| Large (LG) | `rgba(0, 0, 0, 0.1) 0px 20px 25px -5px, rgba(0, 0, 0, 0.1) 0px 8px 10px -6px` | Modals, overlays, maximum prominence |

**Shadow Philosophy**: The system uses layered-micro elevation. Shadows are composed of multiple near-transparent layers (0.1 opacity) stacked at different blur and spread values, creating a barely-there lift that suggests paper or glass rather than dramatic depth. This reinforces the minimalist aesthetic; depth is primarily communicated through color blocking and position, not heavy shadow. The constraint allows the product imagery—which carries the visual weight—to remain the focus.

### Opacity Levels
- **100%** = 1.0 — Default state for all text and interactive elements
- **90%** = 0.9 — Hover state on some interactive elements
- **85%** = 0.85 — Active/pressed state
- **80%** = 0.8 — Hover variant on secondary elements
- **60%** = 0.6 — Muted hover state; secondary text on interaction
- **50%** = 0.5 — Disabled elements (reduced prominence)
- **40%** = 0.4 — Disabled state (strong de-emphasis)
- **30%** = 0.3 — Light charcoal hover variant (`rgba(33, 33, 33, 0.05)` or `rgba(0, 0, 0, 0)` transparent)
- **0%** = 0.0 — Hidden elements (cards in 3D flip animation, opacity transitions to 1 on hover)

### Z-index / Layering
- **Base layer** = 1–2 — Standard page content, cards
- **Dropdown layer** = 10–20 — Floating menus, select options
- **Sticky/floating layer** = 30–40 — Persistent headers, sticky sections
- **Modal/overlay layer** = 50 — Dialogs, modals
- **Toast/alert layer** = 80 — Notifications, top-most alerts

This stacking order ensures modals never hide behind dropdown menus, and alerts remain visible above all other content.

## 7. Do's and Don'ts

### Do
- **Use sharp corners** (`{rounded.none}`, 0px) on primary UI elements — buttons, cards, images, modals. Sharpness is the brand's defining geometric trait.
- **Pair pill-shaped inputs** (`{rounded.full}`) with sharp buttons. The contrast between soft and sharp creates visual interest.
- **Apply generous spacing**: Use `{spacing.lg}` to `{spacing.section}` (20–36px) between major sections to create breathing room and improve scannability.
- **Prioritize product imagery**: Leave ample whitespace around photography; images should never feel cramped.
- **Use `#212121` sparingly** for primary calls-to-action, letting it punch through neutral backgrounds. Reserve pure black (`#000000`) only for headings.
- **Center align modal and overlay text** when presenting single-column information (e.g., shipping location prompts); this creates calm, focused dialogs.
- **Uppercase button and label text** using `{typography.button-sm}` or `{typography.button-md}` to signal interactive affordance.
- **Apply underlines on link hover** consistently across all link types; never remove underlines on focus.
- **Use color-blocking over gradients**: Flat fills reinforce the brand's minimalist, sustainable aesthetic.

### Don't
- **Don't use rounded corners on primary buttons or cards** — the brand commits to 0px radius on core UI.
- **Don't mix serif and sans-serif fonts in the same layout** — stick to Geograph (sans) for nearly all UI; Self Modern for rare display text only.
- **Don't rely on shadows for depth** — the system uses color and position instead. Shadows are reserved for micro-elevation of cards and dropdowns.
- **Don't add decorative gradients, meshes, or overlays** — they conflict with the honest, material-focused design philosophy.
- **Don't crowd text or images** — inadequate spacing feels cramped and contradicts the brand's comfortable, approachable tone.
- **Don't use more than two font weights in a single layout** (400 and 500 are standard; 700 is reserved for rare emphasis).
- **Don't make buttons smaller than 48px in height** on touch-interactive surfaces; 33px is acceptable for small secondary buttons.
- **Don't introduce new colors** outside the defined palette — the five-color system is intentionally constrained to maintain coherence.
- **Don't apply shadows to interactive elements in their default state** — only use shadow on hover/focus if the component is small or floating.
- **Don't remove border-radius from inputs at focus state** — pill-shaped inputs should retain `{rounded.full}` throughout their lifecycle.

## 8. Responsive Behavior

### Breakpoints

| Viewport Width | Content Width | Grid Columns | Nav Link Visibility | Menu Toggle | Heading Size | Body Font Size | Section Padding-X |
|---|---|---|---|---|---|---|---|
| 375px (mobile) | 355px | 4 | 2 visible | Yes | 30px (heading-sm scaled down) | 16px | 0px (full bleed) |
| 768px (tablet) | 748px | 7 | 2 visible | Yes | 40px (heading-sm) | 16px | 0px |
| 1024px (desktop) | 1004px | 7 | 4 visible | No | 40px (heading-sm) | 16px | 0px |
| 1280px (wide) | 1260px | 7 | 4 visible | No | 40px (heading-sm) | 16px | 0px |
| 1440px (ultra-wide) | 1420px | 7 | 4 visible | No | 40px (heading-sm) | 16px | 0px |

**Key transitions:**
- At 768px: Mobile menu toggle remains visible; heading sizes scale to full 40px.
- At 1024px: Navigation expands to 4 visible links; menu toggle disappears.
- At 1280px and above: Layout remains stable; max-width constrains content to 1420px.

### Touch Targets
- **Minimum interactive height**: 48px (buttons, large inputs, navigation items)
- **Minimum interactive width**: 48px (icon buttons, close buttons)
- **Padding around small targets**: At least 16px of whitespace between adjacent touch targets to prevent mis-taps
- **Button padding**: `{spacing.md}` (16px) horizontal for all button text; ensures comfortable tap zone
- **Link underlines**: Extend beyond text width to increase tap target without adding visible padding

### Collapsing Strategy
- **Navigation**: At 768px and below, primary navigation collapses into a hamburger menu toggle. Only 2 key categories (e.g., Men, Women) remain visible in the header; others hide behind menu.
- **Product grids**: 4 columns on mobile (375px), scaling to 7 columns on tablet and desktop. Images scale proportionally; card padding decreases on mobile.
- **Forms**: Input fields remain full-width on mobile; at 768px+, forms may split into 2 columns for multi-field layouts.
- **Footer**: Stacks vertically on mobile; reorganizes into multi-column grid at 768px+.
- **Modals/overlays**: Remain centered on all viewports but width-constrained to 90vw on mobile; fixed width on desktop.
- **Sections**: Horizontal padding remains 0px at all sizes (full bleed); internal margins adjust via `{spacing.section}` and `{spacing.band}` vertical spacing.
- **Typography scaling**: Heading sizes remain fixed (24–40px) across all breakpoints; body remains 16px. No responsive font scaling; sizing is stable.

## 9. Agent Prompt Guide

### Quick Color Reference
- **Primary CTA**: Brand / Primary (`{colors.primary}` — `#212121`) — Use for primary button fills, dominant text
- **Secondary CTA**: Filled / Inverse (`{colors.on-primary}` — `#FFFFFF`) — Use for inverse buttons and text on dark surfaces
- **Background / Canvas**: Canvas (`{colors.canvas}` — `#ECE9E2`) — Default page background and card surfaces
- **Headings**: Ink (`{colors.ink}` — `#000000`) — Primary headings only; rarely used; prefer `{colors.primary}` for most text
- **Body text**: Body (`{colors.body}` — `#575757`) — Secondary descriptive copy and muted labels
- **On dark surfaces**: Muted / On Primary (`{colors.on-primary}` — `#FFFFFF`) — Text and captions on `{colors.primary}` backgrounds

### Iteration Guide
1. **Always apply `{rounded.none}` (0px) to buttons, cards, images, and modals** — sharp corners are the brand's geometric signature.
2. **Pair pill-shaped inputs (`{rounded.full}`) with sharp buttons** — the contrast between soft and sharp creates visual balance.
3. **Use `#212121` (`{colors.primary}`) sparingly** — reserve it for primary CTAs and high-priority text; let it punch against the warm neutral background.
4. **Apply `{spacing.lg}` to `{spacing.section}` (20–36px) between major sections** — this breathing room is essential to the brand's comfortable, unrushed aesthetic.
5. **Uppercase button and label text** using `{typography.button-sm}` or `{typography.button-md}` — uppercase signals interactivity and maintains hierarchy.
6. **Never add decorative gradients, shadows, or overlays beyond the micro-elevation system** — color-blocking and positional depth are the design's foundation.
7. **Center-align text in modals and overlays** when presenting single-column content — this creates calm, focused interactions.
8. **Apply micro-shadows (`{shadow.sm}`) only to floating cards and dropdowns** — avoid heavy shadows on standard UI elements.
9. **Constrain max-width to 1420px on desktop** — full-width layouts break the hierarchy and diminish readability.
10. **Use Geograph for all body and UI text; Self Modern only for rare display headings** — consistency in typeface reinforces the minimalist aesthetic.

## 10. Known Gaps

- **Interaction animations and transitions**: Extracted stylesheets show rotation and opacity changes on card hover (`perspective(600px) translateY(-50%) rotateX(90deg)` → `translateY(0px) rotateX(0deg)`), but duration, easing, and trigger conditions are not specified. Implement reasonable 300–400ms transitions; test against live site for feel.
- **Error, success, warning, and info colors**: The site does not declare semantic status colors. If validation feedback is needed, choose colors outside the primary palette (e.g., red `#E63946` for error, green `#2A9D8F` for success) and document separately; they are not part of this system.
- **Dark mode or theme switching**: Only one theme was extracted (light). No dark-mode variant was observed; if implemented, refer to a separate dark-mode design system.
- **Hover and focus states for all components**: Extracted stylesheets show some hover effects (button background changes, link underlines), but not every component's complete interaction lifecycle. Assume:
  - Buttons: Background and text color invert on hover; borders update accordingly.
  - Links: Underline appears on hover; color remains unchanged unless context requires contrast adjustment.
  - Inputs: Border or background may lighten on focus; retain `{rounded.full}` shape.
  - Dropdowns: Background lightens; borders may appear or darken.
- **Gradient overlays on hero images**: The site features hero sections with potential overlays, but extracted stylesheets do not specify overlay color, opacity, or blend mode. Assume a semi-transparent black (`rgba(0, 0, 0, 0.3)` to `0.5)` if text legibility requires darkening.
- **Animation durations and easing curves**: No transition or animation timing data was extracted. Assume 300ms ease-in-out for most interactions; test on production for feel and performance.
- **Vertical spacing on specific page sections**: Breakpoint data shows horizontal layout changes; vertical section spacing (gap between hero, product grid, footer) is not precisely measured. Use `{spacing.section}` to `{spacing.band}` as defaults; measure on production and adjust per context.
- **Form validation states**: No form error, success, or disabled styling was extracted. Implement validation feedback using the nearest neutral/secondary color for clarity.
- **Opacity on disabled states**: Extracted stylesheets show opacity 0.4–0.7 on disabled elements. Use 0.5 as the default; buttons may override to 0.7 for higher visibility.
- **Cross-origin stylesheets**: Some CSS may be hosted on CDNs or third-party domains and was not fully readable, so edge-case styles may be missing.
- **Surfaces behind authentication or paywalls**: Only the public homepage and product grid sections were analyzed. Checkout, account pages, and personalized content are not covered by this system.

---

# Tokens

```yaml
tokens:
  colors:
    primary:
      value: "#212121"
      description: "Deep charcoal; brand accent, primary CTAs, active states, headings"
    canvas:
      value: "#ECE9E2"
      description: "Warm off-white; default page background and card surfaces"
    ink:
      value: "#000000"
      description: "Pure black; primary headings only"
    body:
      value: "#575757"
      description: "Mid-tone gray; body copy and secondary text"
    on-primary:
      value: "#FFFFFF"
      description: "White; text and labels on brand surfaces"

  typography:
    display:
      family: "Self Modern"
      size: "40px"
      weight: 400
      lineHeight: 1.5
      letterSpacing: "0px"
      description: "Hero headlines"
    heading-sm:
      family: "Geograph"
      size: "24px"
      weight: 400
      lineHeight: 1.33
      letterSpacing: "0.6px"
      description: "Primary section headings"
    heading-sm-strong:
      family: "Geograph"
      size: "24px"
      weight: 500
      lineHeight: 1
      letterSpacing: "0px"
      description: "Emphasized headings"
    heading-xs:
      family: "Geograph"
      size: "12px"
      weight: 500
      lineHeight: 1.33
      letterSpacing: "0px"
      textTransform: "uppercase"
      description: "Subsection labels"
    body-xl:
      family: "Geograph"
      size: "20px"
      weight: 400
      lineHeight: 1.4
      letterSpacing: "0px"
      description: "Large body text"
    body-lg:
      family: "Geograph"
      size: "14px"
      weight: 400
      lineHeight: 1.43
      letterSpacing: "0.7px"
      description: "Standard paragraph text"
    body-lg-strong:
      family: "Geograph"
      size: "14px"
      weight: 500
      lineHeight: 1.43
      letterSpacing: "0.7px"
      textTransform: "uppercase"
      description: "Emphasized body, labels"
    body-lg-tight:
      family: "Geograph"
      size: "14px"
      weight: 400
      lineHeight: 1.5
      letterSpacing: "0px"
      description: "Body with tight line spacing"
    body-lg-2:
      family: "Geograph"
      size: "14px"
      weight: 400
      lineHeight: 1.43
      letterSpacing: "0px"
      description: "Body without letter spacing"
    body-md:
      family: "Geograph"
      size: "12px"
      weight: 400
      lineHeight: 1.33
      letterSpacing: "0px"
      description: "Small body text, links"
    button-md:
      family: "Geograph"
      size: "16px"
      weight: 400
      lineHeight: 1.5
      letterSpacing: "0.8px"
      textTransform: "uppercase"
      description: "Large button labels"
    button-sm:
      family: "Geograph"
      size: "12px"
      weight: 500
      lineHeight: 1.33
      letterSpacing: "0.6px"
      textTransform: "uppercase"
      description: "Standard button labels"
    button-sm-strong:
      family: "Geograph"
      size: "12px"
      weight: 700
      lineHeight: 1.25
      letterSpacing: "0.3px"
      textTransform: "uppercase"
      description: "Bold button variant"
    caption-xs:
      family: "Geograph"
      size: "12px"
      weight: 400
      lineHeight: 1.33
      letterSpacing: "0.6px"
      description: "Small caption text"
    caption-xs-strong:
      family: "Geograph"
      size: "12px"
      weight: 500
      lineHeight: 1.25
      letterSpacing: "0.3px"
      textTransform: "uppercase"
      description: "Emphasized captions"
    caption-xs-uppercase:
      family: "Geograph"
      size: "12px"
      weight: 500
      lineHeight: 1
      letterSpacing: "0.6px"
      textTransform: "uppercase"
      description: "Tight uppercase captions"
    label:
      family: "Geograph"
      size: "16px"
      weight: 400
      lineHeight: 1.5
      letterSpacing: "0px"
      description: "Form labels and input placeholders"
    code-sm:
      family: "Akkurat Mono"
      size: "12px"
      weight: 400
      lineHeight: 1.33
      letterSpacing: "1.2px"
      textTransform: "uppercase"
      description: "Technical small code"
    code-sm-tight:
      family: "Akkurat Mono"
      size: "12px"
      weight: 400
      lineHeight: 1.33
      letterSpacing: "0.6px"
      textTransform: "uppercase"
      description: "Code with tight spacing"
    code-sm-strong:
      family: "Akkurat Mono"
      size: "12px"
      weight: 500
      lineHeight: 1.67
      letterSpacing: "1.2px"
      textTransform: "uppercase"
      description: "Bold code variant"
    code-md:
      family: "Akkurat Mono"
      size: "16px"
      weight: 500
      lineHeight: 1.5
      letterSpacing: "0.8px"
      textTransform: "uppercase"
      description: "Larger code labels"

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

  rounded:
    none: "0px"
    xs: "4px"
    sm: "6px"
    full: "9999px"

  shadows:
    sm:
      value: "rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.1) 0px 1px 2px -1px"
      description: "Micro-elevation for cards and tiles"
    md:
      value: "rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.1) 0px 4px 6px -4px"
      description: "Floating components, dropdowns"
    lg:
      value: "rgba(0, 0, 0, 0.1) 0px 20px 25px -5px, rgba(0, 0, 0, 0.1) 0px 8px 10px -6px"
      description: "Modals and maximum prominence"

  opacity:
    full: 1.0
    strong: 0.9
    active: 0.85
    hover: 0.8
    medium: 0.6
    disabled: 0.5
    weak: 0.4
    faint: 0.3
    hidden: 0.0

  zIndex:
    base: 1
    dropdown: 10
    stickyContent: 30
    modal: 50
    alert: 80

  components:
    button:
      primary:
        background: "#212121"
        color: "#FFFFFF"
        fontSize: "12px"
        fontWeight: 500
        fontFamily: "Geograph"
        padding: "8px 16px"
        borderRadius: "9999px"
        border: "1px solid #212121"
        height: "33px"
        lineHeight: "15px"
      primaryLarge:
        background: "#212121"
        color: "#FFFFFF"
        fontSize: "16px"
        fontWeight: 400
        fontFamily: "Geograph"
        padding: "12px 0px"
        borderRadius: "6px"
        border: "0px"
        height: "48px"
        lineHeight: "24px"
      filled:
        background: "#FFFFFF"
        color: "#212121"
        fontSize: "12px"
        fontWeight: 500
        fontFamily: "Geograph"
        padding: "8px 16px"
        borderRadius: "9999px"
        border: "1px solid #FFFFFF"
        height: "33px"
        lineHeight: "15px"
      outline:
        background: "rgba(0, 0, 0, 0)"
        color: "#FFFFFF"
        fontSize: "12px"
        fontWeight: 500
        fontFamily: "Geograph"
        padding: "8px 16px"
        borderRadius: "9999px"
        border: "1px solid #FFFFFF"
        height: "33px"
        lineHeight: "15px"
      text:
        background: "rgba(0, 0, 0, 0)"
        color: "#212121"
        fontSize: "16px"
        fontWeight: 400
        fontFamily: "Geograph"
        padding: "0px"
        borderRadius: "0px"
        border: "0px"
        height: "48px"
        lineHeight: "24px"
      textSmall:
        background: "rgba(0, 0, 0, 0)"
        color: "#212121"
        fontSize: "12px"
        fontWeight: 500
        fontFamily: "Geograph"
        padding: "0px"
        borderRadius: "0px"
        border: "0px"
        height: "16px"
        lineHeight: "16px"

  breakpoints:
    mobile: "375px"
    tablet: "768px"
    desktop: "1024px"
    wide: "1280px"
    ultraWide: "1440px"
```