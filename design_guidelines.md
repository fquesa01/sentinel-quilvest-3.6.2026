# Enterprise Compliance Platform Design Guidelines

## Brand Identity

**Company Name:** Sentinel Counsel LLP
**Core Slogan:** Privilege by Design
**Tagline:** Corporate Communications. Continuous. Comprehensive. Confidential.

**Brand Positioning:** A bespoke, exclusive attorney-client privilege platform. Less is more - minimal public information conveys exclusivity. White collar defense counsel are the salespeople; general counsel are the users.

---

## Landing Page Design

**Aesthetic:** Minimalist, exclusive, terminal/document-like feel. Evokes confidential legal documents.

**Color Palette:**
- **Background:** Deep green-black (#0d1a14) - Secure, sophisticated, confidential
- **Primary Text:** Muted sage (#8ba89d) - Soft, refined contrast
- **Accent/Slogan:** Teal green (#5ba897) - Distinctive, professional
- **Secondary Text:** Dark sage (#5a6b62) - Subtle hierarchy
- **Footer Text:** Muted green (#3a4a42) - Barely visible, understated
- **Button:** Teal outline (#5ba897) - Transparent background, clean border

**Typography:**
- Brand name: Serif font (Times New Roman, Georgia) - Traditional law firm authority
- Large, light weight for elegance
- Wide letter-spacing for sophistication

**Layout:**
- Full-screen centered hero
- Subtle scan-line texture overlay for document feel
- Single sign-in button (outline style)
- No feature lists, no stats, no testimonials
- Minimal footer with copyright only

---

## Application Design (Internal)

**Design Inspiration:** Superlist - Modern, Warm, and Approachable
**Rationale:** While maintaining enterprise-grade functionality, the design system adopts a warmer, more human-centered aesthetic inspired by Superlist. This creates a more inviting experience for daily use while preserving the professional authority required for compliance work.

**Design Principles:**
- **Warmth & Approachability:** Visual design feels welcoming and reduces cognitive load
- **Efficiency First:** Minimize clicks, maximize information density
- **Professional Clarity:** Clear hierarchy and purpose in every element
- **Workflow-Oriented:** Design supports natural task progression

---

## Typography System

**Font Family:** Modern system fonts (Inter, SF Pro Display, Segoe UI)

**Improved Readability:**
- Letter-spacing: -0.01em (tighter, more refined)
- Line height for body: 1.6-1.65 (improved readability)
- Line height for headings: 1.3 (compact but clear)
- Heading letter-spacing: -0.02em (refined look)

**Type Scale:**
- **Mega Headings:** 3xl font, 800 weight - Dashboard titles, section headers
- **Page Headers:** 2xl font, 700 weight - Main page titles
- **Section Headers:** xl font, 600 weight - Card titles, module headers
- **Subsection Headers:** lg font, 600 weight - Table headers, panel titles
- **Body Text:** base font, 400 weight - Standard content, descriptions
- **Small Text:** sm font, 400 weight - Metadata, timestamps, hints
- **Micro Text:** xs font, 500 weight - Labels, badges, status indicators
- **Monospace Data:** System monospace, sm font - Email addresses, case IDs, timestamps

**Text Treatment:**
- All caps for labels and category headers (tracking-wide)
- Sentence case for body content and descriptions
- Title case for navigation and primary actions

---

## Color System

### Light Mode - Warm & Welcoming
**Philosophy:** Warm neutrals (30° hue) create an inviting, less clinical feel compared to cold blues.

**Color Palette:**
- **Background:** Warm neutral (30° hue, 98% lightness) - Soft, paper-like feel
- **Foreground:** Deep warm gray (30° hue, 12% lightness) - Easy to read
- **Primary:** Vibrant purple (250° hue, 58% lightness) - Distinctive, energetic
- **Borders:** Subtle warm gray (30° hue, 88% lightness) - Gentle separation
- **Cards:** Light warm gray (30° hue, 96% lightness) - Elevated surface

**Chart Colors:** Multi-color palette for better data distinction
- Purple (250°), Orange (25°), Teal (175°), Pink (330°), Green (145°)

### Dark Mode - Rich & Deep (Superlist-Inspired)
**Philosophy:** Rich, deep backgrounds (235° hue, 7-12% lightness) with vibrant accents that pop beautifully on dark.

**Color Palette:**
- **Background:** Deep purple-gray (235° hue, 9% lightness) - Rich, sophisticated
- **Foreground:** Soft white (235° hue, 93% lightness) - WCAG AA compliant
- **Primary:** Bright purple (250° hue, 65% lightness) - Vibrant, pops on dark
- **Borders:** Mid-tone gray (235° hue, 20% lightness) - Visible separation
- **Cards:** Slightly elevated (235° hue, 11% lightness) - Subtle depth

**Chart Colors (Dark Mode):** Brighter variants for better visibility
- Bright Purple (250°), Vibrant Orange (25°), Bright Teal (175°), Hot Pink (330°), Bright Green (145°)

**Contrast Compliance:** All text combinations meet WCAG 2.1 AA standards (4.5:1 minimum)

---

## Layout System

**Spacing Primitives:** Tailwind units of 1, 2, 3, 4, 6, 8, 12, 16
- **Micro spacing:** 1-2 units (tight data rows, inline elements)
- **Standard spacing:** 4-6 units (component padding, card gaps)
- **Section spacing:** 8-12 units (panel separation, page margins)
- **Major divisions:** 16 units (dashboard sections, workflow stages)

**Border Radius:** 10px (0.625rem) for a friendlier, more approachable feel

**Grid Structure:**
- **Dashboard Layout:** 12-column grid with sidebar navigation
- **Sidebar Width:** 16rem (64 units) - fixed navigation
- **Content Area:** Flexible, max-width of 7xl for readability
- **Data Tables:** Full-width within content containers
- **Card Grids:** 2-3 columns on desktop, single column mobile

**Container Strategy:**
- **Full-width sections:** Analytics dashboards, data tables
- **Constrained content:** Forms, detail panels (max-w-5xl)
- **Reading content:** Knowledge base articles (max-w-3xl)

---

## Shadows & Elevation

**Soft, Elegant Shadow System:**
- **2xs:** Minimal depth (1px, 3% opacity) - Subtle hints
- **xs:** Very light (2-3px, 4% opacity) - Input fields
- **sm:** Light (2-6px, 5% opacity) - Buttons, badges
- **default:** Medium (4-8px, 6% opacity) - Cards
- **md:** Noticeable (6-16px, 8% opacity) - Dropdowns, popovers
- **lg:** Prominent (10-24px, 10% opacity) - Modals
- **xl:** Strong (16-32px, 12% opacity) - Hero elements
- **2xl:** Maximum (24-48px, 15% opacity) - Tooltips, context menus

**Dark Mode Shadows:** Deeper, more dramatic (15-50% opacity with dark purple hue)

---

## Component Library

### Navigation Architecture

**Primary Sidebar:**
- Fixed left sidebar, full viewport height
- Warm neutral background in light mode, deep purple-gray in dark mode
- Grouped navigation sections: Monitoring, Cases, Reviews, Knowledge, Reports, Admin
- Icons from Lucide React
- Active state with vibrant purple accent and enhanced weight
- Collapsible for focus mode (icons only)

**Top Bar:**
- Global search (prominent, always accessible)
- User profile with role indicator
- Notification center with violation alerts
- Quick actions menu (Create Case, Schedule Interview)
- Breadcrumb trail for deep navigation

### Dashboard Components

**Metric Cards:**
- Grid layout: 4 cards per row on desktop, stack on mobile
- Each card: Large number (3xl font), label (sm font), trend indicator (arrow icon + percentage)
- Comfortable padding (p-6), soft shadows
- Rounded corners (10px) for friendly feel

**Data Tables:**
- Zebra striping for row distinction (warm neutrals)
- Fixed header with sort controls
- Row actions on hover (view, edit, assign icons)
- Expandable rows for detailed information
- Pagination controls at bottom
- Density toggle (compact/comfortable/spacious)
- Column visibility controls

**Alert List:**
- Priority-based visual hierarchy (icon + severity badge)
- Compact rows showing: Timestamp, Employee, Violation Type, Status
- Quick actions: Assign, Review, Dismiss
- Filter sidebar: By severity, type, date range, assignee

### Case Management Interface

**Case Detail View:**
- Two-column layout: Main content (70%) + Context sidebar (30%)
- **Main Area:** 
  - Case header with ID, status badge, priority indicator
  - Timeline component (vertical, chronological)
  - Flagged communications (email preview cards)
  - Interview recordings (video player embed)
  - Attorney notes (rich text editor)
- **Sidebar:**
  - Employee profile card
  - Related regulations (linked list)
  - Case metadata (creation date, assigned attorney, SLA countdown)
  - Quick actions (Schedule Interview, Generate Report, Close Case)

**Workflow Stepper:**
- Horizontal progress indicator showing: Alert → Investigation → Review → Resolution
- Active step highlighted with vibrant purple, completed steps with checkmarks
- Clickable steps for navigation within case

### Attorney Review Queue

**Queue Management:**
- Kanban-style board OR list view toggle
- **List View:** Sortable table with SLA indicators (red for overdue, yellow for approaching)
- **Kanban View:** Columns for Pending, In Review, Awaiting Info, Completed
- Drag-and-drop assignment
- Batch actions toolbar

**Review Interface:**
- Split-screen: Original communication (left) + Analysis tools (right)
- **Left Panel:** 
  - Email/message display with highlighted trigger phrases
  - Thread view for context
  - Related communications timeline
- **Right Panel:**
  - Violation classification dropdown
  - Regulatory reference search
  - Decision form with templates
  - Evidence tagging interface

### Knowledge Base

**Search-First Design:**
- Prominent search bar with filters (Regulation Type, Jurisdiction, Date)
- Faceted search results with previews
- Citation formatting throughout

**Content Display:**
- Article view: Clean reading experience (max-w-3xl)
- Table of contents sidebar (sticky)
- Cross-reference links (inline, underlined with purple accent)
- Version history timeline
- Related articles suggestions

### Forms & Inputs

**Interview Scheduling:**
- Calendar view with availability overlay
- Participant multi-select with role indicators
- Automated reminder toggles
- Meeting template selection
- Document attachment interface

**Standard Form Controls:**
- Floating labels for text inputs
- Helper text below inputs (sm font, muted)
- Error states with icon + message
- Required field indicators (asterisk)
- Multi-step forms with progress indicator
- 10px border radius for friendly feel

### Reporting Dashboard

**Visualization Layout:**
- Grid of charts: 2-column on desktop, stack on mobile
- Chart types: Line (trends), bar (comparisons), donut (distribution), heat map (risk areas)
- Multi-color palette for better data distinction
- Interactive tooltips on hover
- Export options (PDF, CSV, Excel) in toolbar
- Date range selector (global control)

**Data Export Interface:**
- Advanced search builder (add conditions)
- Preview results table
- Format selection (checkboxes for columns)
- Batch size indicator
- Download button with progress indicator

---

## Animations

**Minimal, Purposeful Animations:**
- Page transitions: 200ms fade-in
- Dropdown/modal entrance: 150ms ease-out
- Loading states: Subtle pulse on skeleton screens
- Hover states: 100ms smooth transitions
- **No:** Decorative animations, auto-playing elements, scroll effects

---

## Accessibility Standards

**WCAG 2.1 AA Compliance:**
- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text
- Minimum touch targets: 44x44px
- Keyboard navigation throughout (visible focus states with purple ring)
- ARIA labels for all interactive elements
- Screen reader announcements for alerts
- Skip navigation links
- Form validation with descriptive errors

**Data Table Accessibility:**
- Semantic table markup (<thead>, <tbody>, scope attributes)
- Sortable column headers announced to screen readers
- Row selection with keyboard (spacebar)

---

## Responsive Behavior

**Breakpoints:**
- Mobile: < 768px - Single column, stacked navigation
- Tablet: 768px - 1024px - Collapsible sidebar, 2-column grids
- Desktop: > 1024px - Full layout with fixed sidebar

**Mobile Adaptations:**
- Hamburger menu for navigation
- Tables convert to card view with expandable rows
- Charts responsive with touch-friendly interactions
- Bottom navigation bar for primary actions

---

## Images

**Functional, Not Decorative:**
Visual assets limited to:
- User avatars (circular, 32px standard, 48px in profiles)
- Company logos in header
- Illustrative icons in empty states ("No cases found")
- Document previews (thumbnails in attachment lists)
- Employee photos in case files (rectangular, 80x80px)

All imagery functional, not decorative - reinforces professional, efficiency-focused design.

---

## Design Token Summary

**Colors:**
- Light: Warm neutrals (30° hue), Purple primary (250° hue, 58% lightness)
- Dark: Deep purple-gray (235° hue, 9% lightness), Bright purple (250° hue, 65% lightness)

**Typography:**
- System fonts: Inter, SF Pro Display, Segoe UI
- Letter-spacing: -0.01em (normal), -0.02em (headings)
- Line height: 1.6-1.65 (body), 1.3 (headings)

**Spacing:**
- Border radius: 10px (friendlier feel)
- Standard unit: 0.25rem (4px)

**Shadows:**
- Soft, elegant elevation system
- 8 levels from 2xs to 2xl
- Increased opacity in dark mode

This design system balances warmth and professionalism, creating an enterprise compliance platform that's both powerful and pleasant to use daily.
