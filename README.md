# SafeX Solutions — Intern Management System (Analytics & Reporting Module)

An enterprise-ready, modular dashboard built for **SafeX Solutions** to manage intern progress, analyze completion velocity with Chart.js, and export executive-ready CSV and multi-page PDF reports.

---

## 1. Executive Summary & Key Features

- **SafeX Brand Integration**: Styled using SafeX Solutions corporate branding palette (Navy `#0F172A`, Blue `#2563EB`, Teal `#0D9488`).
- **Interactive Visual Analytics (Chart.js)**:
  - **Weekly Progress Combo Chart**: Dual-axis bar and line chart displaying weekly hours logged versus completion percentage.
  - **Status Distribution Doughnut Chart**: Visual ratio of Completed, In Progress, and Pending tasks.
  - **Dynamic Synchronization**: Charts automatically re-calculate and re-render upon any table filter, search, add, edit, or delete action.
- **Advanced Data Table & Pagination**:
  - Configurable page sizing (5, 10, or 25 rows per page).
  - Multi-criteria filtering (Week, Status, text search).
  - Column header sorting with visual direction indicators (↑ / ↓).
- **Dual Export System**:
  - **Client-Side CSV Export (Blob API)**: Instant export of filtered datasets without backend dependency.
  - **Executive PDF Report Export (`html2pdf.js`)**: Converts KPI cards, charts, and table logs into a formatted multi-page PDF report.
- **Print-Friendly Fallback (`@media print`)**: Native CSS overrides for seamless printing (`Ctrl+P` / `Cmd+P`), hiding UI controls and navigation elements automatically.

---

## 2. Technical Stack & Architecture

| Layer | Technology |
| :--- | :--- |
| **Markup** | Semantic HTML5 |
| **Styling** | Modern Modular CSS3 (Custom Properties, `@media print`, Flexbox/Grid) |
| **Behavior** | Vanilla JavaScript (ES6+), Local Storage API |
| **Libraries** | Chart.js v4 (Analytics), html2pdf.js v0.10 / jsPDF + html2canvas |

---

## 3. How to Run Locally

1. **Clone or Extract Repository**:
   ```bash
   git clone [https://github.com/your-username/intern-progress-tracker.git](https://github.com/your-username/intern-progress-tracker.git)
   cd intern-progress-tracker