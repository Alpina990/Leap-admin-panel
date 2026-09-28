# PushDay Admin Reference

Reference captured from `https://app.pushday.uz/admin` on 2026-09-27.

## Product Areas

- Users: summary metrics, period controls, search, status filter, paginated data table.
- Payments: revenue, withdrawals, transaction history, reporting.
- Goals: user goals, progress, status, deadline, edit actions.
- Promo codes: discount code management, plan targeting, usage and expiry.
- App catalog: public challenges plus user-created challenges.
- Broadcast: send Telegram messages with optional image attachment.
- AI: provider/model chain, token usage, cost analytics.
- Demo account: editable demo profile and activity data for screenshots.

## Visual Direction

- Light, calm operations dashboard on a cool gray canvas.
- Emerald green is the primary action and active-navigation color.
- White translucent panels use thin cool-gray borders and restrained glass highlights.
- Desktop content is centered in a `1200px` application shell.
- Main surfaces use `18px` radius; inputs and buttons use `12px`; table wrappers use `16px`.
- Typography is SF Pro Display with a system fallback.
- Page titles are `26px / 32px`, bold.
- Page descriptions are `14px / 21px`, muted slate.
- Body and table text are `13.5px / 20px`.
- Table headings are `11.5px`, semibold, uppercase-style labels.
- Controls are compact: `36px` tall.
- Tables use roomy rows, minimal borders, and subtle hover treatment.

## Core Tokens

```css
--app-bg: #f3f5f8;
--app-surface: rgba(255, 255, 255, 0.84);
--app-surface-raised: rgba(255, 255, 255, 0.96);
--app-text: #0f172a;
--app-hint: #64748b;
--app-border: rgba(15, 23, 42, 0.08);
--app-primary: #059669;
--app-primary-hover: #047857;
--app-success: #16a34a;
--app-warning: #d97706;
--app-danger: #dc2626;
--app-success-soft: rgba(22, 163, 74, 0.1);
--app-warning-soft: rgba(217, 119, 6, 0.1);
--app-danger-soft: rgba(220, 38, 38, 0.09);
--app-max-w: 1200px;
--topbar-h: 60px;
--card-r: 18px;
--input-r: 12px;
--tbl-r: 16px;
```

## Shared Composition

1. Sticky translucent top bar with compact brand mark, grouped pill navigation, theme control, and logout control.
2. Centered page shell with title and short description.
3. Optional period/filter strip in a full-width translucent card.
4. Metric cards in a responsive 2/4-column grid, each with a soft tinted icon tile and compact value.
5. Main data panels with a toolbar row, search or action controls, table, and pagination.
6. Modal and side-sheet patterns for add, edit, detail, reporting, and destructive actions.

## Pen.dev Prompt

Create a complete desktop admin panel matching the supplied PushDay reference screenshots. Use one polished light-theme dashboard frame focused on Users, and clearly show the reusable component system for Payments, Goals, Promo Codes, App Challenges, Broadcast, AI, and Demo Account. Preserve the compact emerald-accented operations dashboard style, translucent white cards, cool-gray canvas, restrained borders, fixed navigation, filters, metric cards, data tables, pagination, and modal patterns. Do not invent a marketing landing page.

## Current Pen.dev Draft

- Source: `../../leap-admin-pushday.pen`
- Scope: eight complete 1440 x 1000 screens covering Users, Payments, Goals, Promo Codes, App Challenges, Broadcast, AI and Demo Account.
- Preview directory: `./previews/`
- Contact sheet: `./previews/pushday-admin-contact-sheet.png`

The Users and Payments frames are the initial reference screens. Goals, Promo Codes, App Challenges, Broadcast, AI and Demo Account were completed from the live admin analysis on 2026-09-27. The previews are local renders of the `.pen` structure because the Pen CLI account was not connected on this machine.
