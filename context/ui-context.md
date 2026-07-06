# UI Context

## Theme

Dark-only interface. No light mode.

The design language is a focused, information-dense workspace — near-black backgrounds, layered surfaces, and restrained accent color used only to draw the eye to what matters: match scores, new postings, and status changes.

The UI should feel calm, precise, and fast, inspired by products like Linear, Notion, and Superhuman — tools built for triage, not browsing.

Use tight information density on list views, generous spacing on detail views. The job list is the center of gravity, not the dashboard summary cards.

Interactive elements and match-score indicators should use a single accent color family so the eye isn't pulled in multiple directions; status colors (good match / applied / rejected) carry their own semantic meaning separate from the UI accent.

## Colors

All colors must be defined as CSS custom properties in `globals.css`.

Never use hardcoded hex values directly in components.

| Role               | CSS Variable         | Value       |
| ------------------ | --------------------- | ----------- |
| Page background    | `--bg-base`           | `#09090B`   |
| Elevated surface   | `--bg-elevated`       | `#111114`   |
| Card surface       | `--bg-surface`        | `#18181B`   |
| Hover surface      | `--bg-hover`          | `#202024`   |
| Primary text       | `--text-primary`      | `#FAFAFA`   |
| Secondary text     | `--text-secondary`    | `#A1A1AA`   |
| Muted text         | `--text-muted`        | `#71717A`   |
| Primary accent     | `--accent-primary`    | `#4F7CFF`   |
| Destructive accent | `--accent-danger`     | `#DC2626`   |
| Border             | `--border-default`    | `#27272A`   |
| Strong border      | `--border-strong`     | `#3F3F46`   |
| Good match         | `--match-good`        | `#22C55E`   |
| Weak match         | `--match-weak`        | `#F59E0B`   |
| No match           | `--match-none`        | `#71717A`   |
| Success            | `--state-success`     | `#22C55E`   |
| Warning            | `--state-warning`     | `#F59E0B`   |
| Error              | `--state-error`       | `#EF4444`   |
| Focus ring         | `--focus-ring`        | `#4F7CFF`   |
| Overlay backdrop   | `--overlay-backdrop`  | `#000000B3` |

## Typography

| Role      | Font       | Variable      |
| --------- | ---------- | ------------- |
| UI text   | Geist Sans | `--font-sans` |
| Code/mono | Geist Mono | `--font-mono` |

Typography should feel clean, technical, and legible at small sizes — job titles, company names, and salary ranges appear densely on list rows.

* Compact spacing hierarchy on list views
* Larger, more spacious type on job detail views
* Use muted text aggressively for metadata (posted date, location) so titles stand out
* Prefer medium font weights over thin typography
* Numeric data (salary, match score) uses tabular figures for alignment

## Border Radius

| Context           | Class         |
| ------------------ | ------------- |
| Inline / small UI  | `rounded-xl`  |
| Inputs / buttons   | `rounded-2xl` |
| Cards / panels     | `rounded-2xl` |
| Drawers / sheets   | `rounded-3xl` |
| Modals / overlays  | `rounded-3xl` |

## Component Library

Use `shadcn/ui` on top of Tailwind CSS.

* Components live in `components/ui/`
* Use the shadcn CLI for generating components
* Extend components instead of rewriting primitives
* Use Radix primitives for accessibility and keyboard support
* Prefer composition over deeply customized variants

## Layout Patterns

* Jobs layout: left filter sidebar, center scrollable job list, right detail panel (opens on row click)
* Dashboard layout: top navigation with summary cards + recent activity feed below
* Sidebars: fixed-width dark panels with subtle border separators
* Modals: centered overlay with backdrop blur and elevated surface
* Navigation: sticky top navbar with translucent background and bottom border
* Settings pages: two-column layout with sidebar navigation and content panel
* Saved jobs: three-column kanban (Interested / Applied / Rejected)

## Job List

* Dense row layout: title, company logo + name, location, match-score badge, posted date
* Subtle hover highlight, no heavy borders between rows
* Match score shown as a small colored badge (good/weak/none), never a full progress bar in the list — save that for the detail panel
* New-since-last-visit rows get a subtle left accent bar, cleared once viewed
* Keep row height consistent regardless of tag count — overflow tags collapse into a "+N" chip

## Job Detail Panel

* Slides in from the right, doesn't navigate away from the list
* AI summary card at the top: Role / Requirements / Responsibilities / Salary / Benefits / Apply Link
* Match score shown prominently with the explanation and missing-skills list
* Status selector (Interested / Applied / Rejected) and Save/Apply actions pinned at the top of the panel

## Match Score Colors

| Verdict     | Color Token     |
| ----------- | ---------------- |
| Good match  | `--match-good`   |
| Weak match  | `--match-weak`   |
| Not scored  | `--match-none`   |

## Saved Job Status Colors

| Status       | Color Token         |
| ------------- | -------------------- |
| Interested    | `--accent-primary`   |
| Applied       | `--state-success`    |
| Rejected      | `--state-error`       |

## Buttons

### Primary Buttons
* Solid accent background
* Subtle glow on hover
* Bright text contrast
* Smooth hover and press transitions

### Secondary Buttons
* Elevated dark surface
* Subtle border
* Accent hover state

### Ghost Buttons
* Transparent background
* Muted text
* Accent text on hover

## Inputs

* Dark filled backgrounds
* Subtle borders
* Accent focus ring
* Smooth focus transitions
* Avoid harsh outlines
* Filter inputs (multi-select, range sliders) always show the active filter count as a badge

## Motion

* Use Framer Motion for premium transitions
* Motion should feel smooth and responsive, never distracting
* Prefer fade, scale, and subtle slide animations (detail panel slide-in, kanban card drag)
* Keep animations under 300ms for core interactions
* New-job indicators use a brief, subtle pulse — not a persistent animation

## Shadows & Effects

* Prefer soft layered shadows over hard borders
* Use subtle gradient glow effects sparingly — only on primary CTAs and the "new posting" indicator
* Use backdrop blur for overlays and floating panels
* Avoid excessive glassmorphism or neon effects; this is a triage tool, not a canvas

## Icons

Use Lucide React.

* Stroke-based icons only
* Inline icons: `h-4 w-4`
* Button icons: `h-5 w-5`
* Large feature icons: `h-6 w-6`
* Maintain consistent stroke widths throughout the app

## Responsive Design

* Desktop-first, since job triage is a focused desktop workflow
* Tablet support for the dashboard and job list (detail panel becomes a full-screen sheet)
* Mobile support for browsing and saved-job status changes only in MVP
* Filter sidebar collapses to a sheet on smaller viewports

## Accessibility

* Maintain accessible contrast ratios in dark mode
* Visible keyboard focus states required
* All interactive elements must support keyboard navigation
* Match score and status must never rely on color alone — pair with a label or icon
