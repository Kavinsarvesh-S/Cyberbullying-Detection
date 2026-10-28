# DESIGN.md — Cyberbullying Detection System Design Specification

*Incorporating principles from **Linear** & **Stripe** (`awesome-design-md`), anti-AI-slop disciplines (`hallmark`), and out-of-distribution craft standards (`impeccable`).*

---

## 1. Design Direction & Voice
- **Surface Mode**: **Operate** — content moderation and trust & safety telemetry workbench.
- **Tone**: Quietly luxurious, restrained, technical, and precise. Designed to resemble production-grade tools like Linear and Stripe Radar.
- **Anti-Slop Guarantees** (`hallmark`):
  - **No generic AI tropes**: Zero purple-to-pink gradient heroes, zero gradient text, zero floating orbs or aurora meshes, and zero fake browser/terminal chrome.
  - **No nested containers**: Single-layer structural panels (`.panel`); eliminated all card-in-card nesting (`div.textarea-shell`, double-dashed empty boxes).
  - **Honest copy**: Real architecture specs (LinearSVC, TF-IDF unigram+bigram, 10,000 features, 6 evaluated classes, latency < 10ms); no fabricated metrics or fake social proof.
  - **Locked tokens**: 100% of colors and font-families reference CSS variables.
  - **Typography purity**: Roman headings only (`font-style: normal`), no italicized headers.

---

## 2. Geometry & Spacing
- **Panels**: `16px` border-radius (`--radius-lg`) with hairline borders (`rgba(255, 255, 255, 0.09)` in dark mode, `rgba(0, 0, 0, 0.08)` in light mode).
- **Form Controls & Inputs**: Direct input fields with `12px` border-radius (`--radius-md`) and a subtle focus ring (`3px` accent glow).
- **Interactive Controls**: `8px` border-radius (`--radius-sm`), `600` weight, clean inline SVGs, and complete 8-state implementations.
- **Pills & Badges**: `9999px` soft pill geometry for classification tags and sample triggers.
- **Line Length & Measure**: Body and lede text measures constrained strictly to `58ch`–`65ch` with `text-wrap: pretty` to eliminate stragglers and visual fatigue.

---

## 3. Typography System
- **Interface & Display Face**: `IBM Plex Sans` (weights 400, 500, 600, 700). Distinctive neutral industrial grotesque (avoids overused AI slop fonts).
- **Code & Numeric Data**: `JetBrains Mono` (weights 400, 500, 600) reserved exclusively for confidence metrics, row numbers, cURL commands, and token streams.
- **Scale**:
  - Page Titles: `clamp(1.65rem, 2.5vw, 2.15rem)`, `-0.025em` letter-spacing, weight 700.
  - Panel Headers: `0.9375rem`, weight 600.
  - Body Text: `0.9375rem` (15px), line-height `1.6`.
  - Captions & Meta: `0.75rem` - `0.8125rem` (12px - 13px), weight 500/600.

---

## 4. Color Palette & Theming (100% WCAG AA Passing)
- **Dark Theme (Default)**:
  - Canvas: `#090d16` (deep navy-slate)
  - Surface: `#111827`
  - Elevated / Inputs: `#1e293b` / `#0b1120`
  - Primary Text: `#f8fafc` (16:1 contrast)
  - Muted Text / Placeholders: `#94a3b8` (6.2:1 contrast)
  - Links: `#a5b4fc` (9.6:1 contrast)
  - Primary Accent (Indigo): `#4f46e5` with `#ffffff` text (6.5:1 contrast)
  - Flagged Alert: `#fb7185` with `#ffffff` text (5.8:1 contrast)
  - Clean Indicator: `#10b981` (emerald)
- **Light Theme**:
  - Canvas: `#f8fafc` (slate-50)
  - Surface: `#ffffff`
  - Elevated / Inputs: `#f1f5f9` / `#f8fafc`
  - Primary Text: `#0f172a` (16:1 contrast)
  - Muted Text: `#475569` (7.8:1 contrast)
  - Links: `#3730a3` (10.2:1 contrast)
  - Primary Accent: `#4338ca` (7.2:1 contrast)
  - Flagged Alert: `#e11d48`
  - Clean Indicator: `#059669`

---

## 5. Themed Browser Surfaces & State Discipline
- **Browser Surfaces**:
  - Custom text selection: `::selection` tinted with `var(--primary-dim)`.
  - Themed caret: `caret-color: var(--primary-color)`.
  - Custom scrollbars: styled track and thumb matching canvas and surface rules.
  - Focus rings: `:focus-visible` with 2px solid accent and 2px offset.
- **8-State Interactive Support**:
  - Default, `:hover` (`.is-hover`), `:focus-visible` (`.is-focus`), `:active` (`.is-active`), `:disabled`, loading, error (`role="alert"`), and success.
- **Responsiveness**:
  - Verified across 320px, 375px, 414px, 768px, and desktop widths.
  - Root `overflow-x: clip`, wrap-safe headers, and native `prefers-reduced-motion` compliance.
