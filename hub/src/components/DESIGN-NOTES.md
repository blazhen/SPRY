# Design notes for page builders

Body text is 18px. Smallest text is 15px (badges, table headers). Targets are 44px or more; main buttons 48px (`btn btn-primary btn-lg`). Colour is never the only signal: badges carry words and icons.

## Page wrapper
The Shell already wraps every page in `.page` (72rem, centred, padded). Do not add another `.page` inside a page. Do not use viewport height.

## Classes (styles.css)
- `.t-page` page title (1.9 to 2.5rem). `.t-section` section heading 1.4rem. `.t-body` 1.125rem. `.t-small` 1rem.
- `.page-head` title left, action right, wraps. Prefer `PageHead`.
- `.stack` 1rem vertical gap. `.stack-lg` 2rem vertical gap.
- `.card` panel, 1.5rem padding. `.panel` older thin panel. `.grid-cards` auto-fit grid, min 15rem.
- `.tbl` table: navy-wash header, bold 15px th, 56px rows, hairlines, hover tint. Put it in `.tbl-wrap` for a rounded border.
- `.tbl-click` on the table makes rows relative and shows a focus ring around the whole row. `.row-link` goes on the real `<a href>` in the name cell; its `::after` covers the row. `.row-inner` on inner links (phone, contact) lifts them above the cover.
- `.tbl-stack` on the table: under 640px rows become cards, `thead` stays for screen readers, put `data-label="Value"` on each `td`.
- `.num-col` right aligned tabular numbers (th and td).
- Colour pairs, background plus text: `.st-slate .st-teal .st-amber .st-blue .st-green .st-won .st-lost .st-hot`. Use only with a text label.
- `.badge` pill base. `.chip` pill button (44px). `.btn`, `.btn-primary`, `.btn-quiet`, `.btn-ghost`, `.btn-danger`, `.btn-sm` (44px), `.btn-lg` (48px), `.btn-icon`.
- `.field`, `.label`, `.hint`, `.err` form bits, 17 to 18px. `.check` custom checkbox.
- `.tabs`, `.tab`, `.tab-count` used by `Tabs`.
- Shell only: `.topbar .nav-link .nav-count .bottombar .bottom-item .menu-pop .menu-item`.
- CSS tokens: `--c-blue` accent, `--c-bar` bar fill, `--st-<name>-bg` and `--st-<name>-fg` (name = slate, teal, amber, blue, green, won, lost, hot). Tailwind colours unchanged (`bg-navy-wash`, `text-muted`, ...).

## Components (ui.tsx)
- `StageBadge({stage})` icon + stage name, own colour per stage.
- `StallBadge({job})` "12 days here"; amber when slow, red when stuck, nothing when ok. Needs `stall` from store.
- `StatusBadge({status})` quote status. `RevTag({revision})` "Rev 2".
- `StatTile({label, value, hint?, tone?})` big number card; tone plain, good, warn, bad.
- `PageHead({title, subtitle?, action?})` h1 plus the one main action.
- `Section({title, action?, children})` h2 with labelled region.
- `Tabs({tabs:{id,label,count?}[], value, onChange, label})` role tablist, arrow keys, Home/End. Tab button ids are `tab-<id>`; the page shows the panel.
- `Dialog({open,onClose,title,children,footer?,size?})` native modal.
- `ConfirmDialog({open,title,children,confirmLabel,onConfirm,onClose,tone?})` Cancel (focused) and a `btn-primary` confirm; tone `danger` makes the confirm red. Closing after confirm is up to `onConfirm`.
- `MoneyText({value, whole?, className?})` dollars, tabular figures.
- `DaysChip({days, tone?, suffix?})` "5 days", "Today".
- `toast(msg)` and `Toaster`. `Notice({tone})`. `EmptyState({title})`. `AnimatedMoney`.

## Routes
`href.prices()` is `#/prices`, `href.week()` is `#/week`. Unknown routes show To do.

## Contrast (WCAG ratio, text on its own fill, calculated with a small script)
Needs 4.5 for text. Light: slate 8.73, teal 6.46, amber 6.82, blue 7.94, green 6.52, won 7.89, lost 7.16, hot 6.02.
Dark: slate 9.19, teal 8.31, amber 8.14, blue 7.66, green 8.43, won 7.77, lost 6.54, hot 6.65.
Other: white on bar navy 12.49 (light) and 17.75 (dark bar); blue accent on bar 5.86 (light) and 8.32 (dark); muted text 7.14 on white and 7.86 on dark surface. Focus ring (needs 3.0): navy on page 11.53 light, light blue on page 8.79 dark; white ring on the bars 12.49 or more.

## Not yet / notes
- `StageBadge` does not yet show `STAGE_HELP`; pages can print it beside the badge.
- Tabs does not set `aria-controls`; pages may add `role="tabpanel"` with `aria-labelledby="tab-<id>"`.
