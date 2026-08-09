# Intern Management System — Weekly Progress & Reports Module

A production-ready, front-end dashboard for interns to log, filter, sort, and export their weekly task progress. Built with plain HTML5, CSS3, and vanilla ES6+ JavaScript — no frameworks, no build step, no dependencies.

---

## 1. Overview & Key Features

This module gives an intern (or their team lead) a single dashboard to track weekly work:

- **Summary cards** — live counts of total tasks, completed tasks, in-progress tasks, and total hours logged.
- **Weekly Progress Table** — columns for Task Name, Week Number, Hours Spent, Status, Notes/Comments, and Actions (edit / delete), seeded with 8 realistic mock entries spanning Weeks 1–4 and all three statuses.
- **Status badges** — color-coded pill tags: green (`Completed`), amber (`In Progress`), blue (`Pending`).
- **Dynamic filtering** — dropdowns for *Week* and *Status*, plus a live text search on task name. All filters combine and update the table instantly with no page reload.
- **Client-side column sorting** — click any of the Task Name / Week / Hours / Status headers to sort ascending/descending, with an arrow indicator (↑ / ↓) showing the active sort direction.
- **CSV export** — an "Export to CSV" button that exports exactly what's currently visible (i.e., respects active filters), generated entirely in the browser using the `Blob` API.
- **Add / Edit entry modal** — an accessible dialog (focus trap, `Escape` to close, inline validation) for creating new entries or editing existing ones, which immediately updates the in-memory state and re-renders the table.
- **Delete with confirmation** — guards against accidental data loss.
- **Toast notifications** — lightweight, non-blocking feedback for add/edit/delete/export actions.
- **Fully responsive** — adapts cleanly from desktop down to mobile (filter bar stacks, table scrolls horizontally, buttons go full-width).
- **Accessible by default** — semantic HTML, visible keyboard focus states, `aria-live` toast, `role="dialog"` modal, keyboard-operable sortable headers, `prefers-reduced-motion` respected.

---

## 2. Technical Stack & Architecture

| Layer      | Technology                                   |
|------------|-----------------------------------------------|
| Markup     | Semantic HTML5                                 |
| Styling    | Modular CSS3 with custom properties (design tokens) — no framework |
| Behavior   | Vanilla JavaScript (ES6+), IIFE module pattern |
| Fonts      | Inter (Google Fonts), system-UI fallback stack |
| Persistence| In-memory JavaScript state (see note below)    |

### File structure

```
intern-progress-tracker/
├── index.html   # Semantic markup: header, summary cards, control panel, table, modal, toast
├── style.css    # Design tokens (colors/spacing/radius), layout, components, responsive rules
├── script.js    # State management, rendering, filtering, sorting, CSV export, modal logic
└── README.md    # This file
```

### Architecture notes

- **`script.js` is organized into clearly commented sections**: State → Mock Data → DOM References → Rendering → Filtering → Sorting → CSV Export → Modal → Delete → Toast → Event Wiring/Init. Everything lives inside a single IIFE (`(() => { ... })()`) to avoid polluting the global scope.
- **Single source of truth**: all table rows are derived from one `entries` array in memory. Filtering and sorting are *pure, non-mutating* functions (`getVisibleEntries()`, `sortEntries()`) — the underlying `entries` array is never reordered, so switching filters/sorts is always safe and predictable.
- **Event delegation** is used on the table body for row-level Edit/Delete actions, so newly rendered rows automatically pick up their handlers without re-binding listeners.
- **State is in-memory only** (no `localStorage`/backend), by design for this front-end module — refreshing the page resets to the seeded mock data. This keeps the deliverable self-contained and framework-free; see "Extending this project" below for how to wire up persistence.

---

## 3. How to Run Locally

No build tools, package managers, or servers are required.

**Option A — Open directly:**
1. Download/unzip the `intern-progress-tracker` folder.
2. Double-click `index.html` (or right-click → *Open with* your browser).

**Option B — Local dev server (recommended for consistent behavior across browsers):**
```bash
cd intern-progress-tracker

# Python 3
python3 -m http.server 8080

# or Node.js
npx serve .
```
Then visit `http://localhost:8080` in your browser.

> Works in all modern evergreen browsers (Chrome, Edge, Firefox, Safari). No transpilation needed — all JS features used (arrow functions, template literals, `Array.prototype.flat`-free ES6+, `Blob`, `URL.createObjectURL`) are broadly supported.

---

## 4. CSV Export Mechanism (Blob API)

The "Export to CSV" button demonstrates a fully client-side file download with **no server round-trip**:

1. **Collect visible rows** — `getVisibleEntries()` returns the currently filtered + sorted rows, so the export always matches what the user sees on screen.
2. **Build a CSV string** — each field is run through `csvEscape()`, which wraps a value in double quotes (and doubles any internal quotes) whenever it contains a comma, quote, or newline, keeping the file spec-compliant even with free-text notes.
3. **Create a `Blob`**:
   ```js
   const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
   ```
   The `Blob` wraps the CSV string as an immutable, file-like object with the correct MIME type.
4. **Generate a downloadable object URL**:
   ```js
   const url = URL.createObjectURL(blob);
   ```
5. **Trigger the download** by creating a temporary, invisible `<a>` element with a `download` attribute set to `weekly_progress_report.csv`, clicking it programmatically, then removing it from the DOM.
6. **Clean up** with `URL.revokeObjectURL(url)` to free the memory held by the object URL once the download has started.

This pattern requires zero backend infrastructure and works entirely offline.

---

## 5. Status Update Template — For Group Leader

Copy, fill in the brackets, and send as a weekly check-in (email/Slack):

```
Subject: Weekly Progress Update — Week [N] — [Your Name]

Hi [Group Leader's Name],

Here's my status update for Week [N]:

✅ Completed this week:
- [Task name] — [X hours] — [one-line outcome/result]
- [Task name] — [X hours] — [one-line outcome/result]

🔄 In Progress:
- [Task name] — [X hours logged so far] — [current status / next milestone]

⏳ Pending / Blocked:
- [Task name] — [reason it's blocked, if any] — [who/what I'm waiting on]

📊 Summary:
- Total hours logged this week: [X]h
- Tasks completed: [X] / Tasks in progress: [X] / Tasks pending: [X]

🧭 Plan for next week:
- [Priority 1]
- [Priority 2]

Let me know if you'd like more detail on any item, or if priorities should shift.

Thanks,
[Your Name]
```

*(Tip: use the "Export to CSV" button in the dashboard to attach the underlying data for full transparency.)*

---

## 6. Extending This Project

- **Persistence**: swap the in-memory `entries` array for `localStorage`, IndexedDB, or a real backend API (the state layer is already isolated in `script.js`, so this is a drop-in change).
- **Multi-user support**: add an intern/user selector and scope entries by user ID.
- **Pagination**: if the entry count grows large, paginate `getVisibleEntries()` before rendering.
- **Charts**: the summary card values are already computed centrally in `renderSummary()` — easy to feed into a charting library later.

---

## License

Provided as a submission deliverable for the Intern Management System task. Free to reuse and adapt.
