/* ==========================================================================
   Intern Management System — Weekly Progress & Reports Module
   script.js — vanilla ES6+ JavaScript, no external dependencies
   ==========================================================================
   Table of contents:
   1. State
   2. Mock data (seed)
   3. DOM references
   4. Rendering
   5. Filtering
   6. Sorting
   7. CSV Export (Blob API)
   8. Modal (Add / Edit entry)
   9. Delete entry
   10. Toast notifications
   11. Event wiring / init
   ========================================================================== */

(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 1. STATE
   * ------------------------------------------------------------------ */

  /**
   * Single source of truth for all progress entries.
   * Each entry: { id, taskName, week, hours, status, notes }
   */
  let entries = [];

  /** Current active filters. */
  const filters = {
    week: 'all',
    status: 'all',
    search: '',
  };

  /** Current sort configuration. */
  const sortState = {
    key: null,       // 'taskName' | 'week' | 'hours' | 'status'
    direction: null, // 'asc' | 'desc'
  };

  /** Auto-incrementing id counter for new entries. */
  let nextId = 1;

  /* ------------------------------------------------------------------ *
   * 2. MOCK DATA (seed) — realistic, diverse entries across weeks/status
   * ------------------------------------------------------------------ */

  const SEED_DATA = [
    {
      taskName: 'Set up project repository & CI pipeline',
      week: 1,
      hours: 6,
      status: 'Completed',
      notes: 'Configured GitHub Actions for lint + build checks.',
    },
    {
      taskName: 'Onboarding & environment setup',
      week: 1,
      hours: 4,
      status: 'Completed',
      notes: 'Installed toolchain, reviewed codebase architecture docs.',
    },
    {
      taskName: 'Build responsive navbar component',
      week: 2,
      hours: 8,
      status: 'Completed',
      notes: 'Implemented mobile hamburger menu with keyboard support.',
    },
    {
      taskName: 'Design authentication flow (login/signup)',
      week: 2,
      hours: 10,
      status: 'In Progress',
      notes: 'Wireframes approved; wiring up form validation next.',
    },
    {
      taskName: 'Integrate REST API for user dashboard',
      week: 3,
      hours: 7,
      status: 'In Progress',
      notes: 'Waiting on backend team to finalize endpoint schema.',
    },
    {
      taskName: 'Write unit tests for utility functions',
      week: 3,
      hours: 5,
      status: 'Pending',
      notes: 'Scheduled to start after API integration is stable.',
    },
    {
      taskName: 'Accessibility audit of core pages',
      week: 4,
      hours: 3,
      status: 'Pending',
      notes: 'Blocked until final UI components are merged.',
    },
    {
      taskName: 'Weekly sprint demo preparation',
      week: 4,
      hours: 2.5,
      status: 'Completed',
      notes: 'Presented progress to the team; positive feedback received.',
    },
  ];

  /* ------------------------------------------------------------------ *
   * 3. DOM REFERENCES
   * ------------------------------------------------------------------ */

  const dom = {
    tableBody: document.getElementById('tableBody'),
    emptyState: document.getElementById('emptyState'),
    resultsCount: document.getElementById('resultsCount'),

    filterWeek: document.getElementById('filterWeek'),
    filterStatus: document.getElementById('filterStatus'),
    filterSearch: document.getElementById('filterSearch'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    emptyResetBtn: document.getElementById('emptyResetBtn'),

    exportCsvBtn: document.getElementById('exportCsvBtn'),
    addEntryBtn: document.getElementById('addEntryBtn'),

    statTotal: document.getElementById('statTotal'),
    statCompleted: document.getElementById('statCompleted'),
    statInProgress: document.getElementById('statInProgress'),
    statHours: document.getElementById('statHours'),

    // Modal
    modalOverlay: document.getElementById('modalOverlay'),
    modalTitle: document.getElementById('modalTitle'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    modalCancelBtn: document.getElementById('modalCancelBtn'),
    entryForm: document.getElementById('entryForm'),
    entryId: document.getElementById('entryId'),
    taskNameInput: document.getElementById('taskName'),
    weekNumberInput: document.getElementById('weekNumber'),
    hoursSpentInput: document.getElementById('hoursSpent'),
    statusInput: document.getElementById('status'),
    notesInput: document.getElementById('notes'),

    toast: document.getElementById('toast'),

    sortableHeaders: document.querySelectorAll('th.sortable'),
  };

  /* ------------------------------------------------------------------ *
   * 4. RENDERING
   * ------------------------------------------------------------------ */

  /** Maps a status string to its badge CSS class. */
  function statusBadgeClass(status) {
    switch (status) {
      case 'Completed': return 'badge--completed';
      case 'In Progress': return 'badge--in-progress';
      case 'Pending': return 'badge--pending';
      default: return '';
    }
  }

  /** Escapes HTML special characters to prevent injection when rendering user input. */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  /** Populates the "Filter by Week" dropdown based on the distinct weeks present in state. */
  function populateWeekFilterOptions() {
    const currentValue = dom.filterWeek.value || 'all';
    const distinctWeeks = [...new Set(entries.map((e) => e.week))].sort((a, b) => a - b);

    dom.filterWeek.innerHTML = '<option value="all">All Weeks</option>' +
      distinctWeeks.map((w) => `<option value="${w}">Week ${w}</option>`).join('');

    // Restore previous selection if it still exists among the options
    const stillValid = currentValue === 'all' || distinctWeeks.includes(Number(currentValue));
    dom.filterWeek.value = stillValid ? currentValue : 'all';
    filters.week = dom.filterWeek.value;
  }

  /** Returns the entries array after applying current filters + sort. */
  function getVisibleEntries() {
    let result = entries.filter((entry) => {
      const matchesWeek = filters.week === 'all' || entry.week === Number(filters.week);
      const matchesStatus = filters.status === 'all' || entry.status === filters.status;
      const matchesSearch = entry.taskName.toLowerCase().includes(filters.search.toLowerCase());
      return matchesWeek && matchesStatus && matchesSearch;
    });

    if (sortState.key) {
      result = sortEntries(result, sortState.key, sortState.direction);
    }

    return result;
  }

  /** Renders the table body, empty state, and results count based on current filters/sort. */
  function renderTable() {
    const visible = getVisibleEntries();

    if (visible.length === 0) {
      dom.tableBody.innerHTML = '';
      dom.emptyState.hidden = false;
    } else {
      dom.emptyState.hidden = true;
      dom.tableBody.innerHTML = visible.map(rowTemplate).join('');
    }

    dom.resultsCount.textContent = `Showing ${visible.length} of ${entries.length} entries`;
    renderSummary();
  }

  /** Builds the HTML for a single table row. */
  function rowTemplate(entry) {
    return `
      <tr data-id="${entry.id}">
        <td class="cell-task">${escapeHtml(entry.taskName)}</td>
        <td>Week ${entry.week}</td>
        <td>${entry.hours}h</td>
        <td><span class="badge ${statusBadgeClass(entry.status)}">${escapeHtml(entry.status)}</span></td>
        <td class="cell-notes">${escapeHtml(entry.notes) || '<span style="color:var(--color-text-muted)">—</span>'}</td>
        <td class="col-actions">
          <div class="row-actions">
            <button type="button" class="icon-btn icon-btn--edit" data-action="edit" data-id="${entry.id}" aria-label="Edit ${escapeHtml(entry.taskName)}" title="Edit entry">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>
            </button>
            <button type="button" class="icon-btn icon-btn--delete" data-action="delete" data-id="${entry.id}" aria-label="Delete ${escapeHtml(entry.taskName)}" title="Delete entry">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }

  /** Updates the summary stat cards based on the *full* entry set (not just filtered). */
  function renderSummary() {
    const total = entries.length;
    const completed = entries.filter((e) => e.status === 'Completed').length;
    const inProgress = entries.filter((e) => e.status === 'In Progress').length;
    const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);

    dom.statTotal.textContent = total;
    dom.statCompleted.textContent = completed;
    dom.statInProgress.textContent = inProgress;
    dom.statHours.textContent = `${totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)}h`;
  }

  /* ------------------------------------------------------------------ *
   * 5. FILTERING
   * ------------------------------------------------------------------ */

  function handleFilterChange() {
    filters.week = dom.filterWeek.value;
    filters.status = dom.filterStatus.value;
    filters.search = dom.filterSearch.value.trim();
    renderTable();
  }

  function resetFilters() {
    dom.filterWeek.value = 'all';
    dom.filterStatus.value = 'all';
    dom.filterSearch.value = '';
    filters.week = 'all';
    filters.status = 'all';
    filters.search = '';
    renderTable();
  }

  /* ------------------------------------------------------------------ *
   * 6. SORTING
   * ------------------------------------------------------------------ */

  /** Order used when sorting the Status column so severity/progress reads logically. */
  const STATUS_SORT_ORDER = { Pending: 0, 'In Progress': 1, Completed: 2 };

  /** Returns a new sorted array; does not mutate the input. */
  function sortEntries(list, key, direction) {
    const sorted = [...list].sort((a, b) => {
      let comparison = 0;

      switch (key) {
        case 'taskName':
          comparison = a.taskName.localeCompare(b.taskName, undefined, { sensitivity: 'base' });
          break;
        case 'week':
          comparison = a.week - b.week;
          break;
        case 'hours':
          comparison = Number(a.hours) - Number(b.hours);
          break;
        case 'status':
          comparison = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
          break;
        default:
          comparison = 0;
      }

      return direction === 'desc' ? -comparison : comparison;
    });

    return sorted;
  }

  /** Handles a click on a sortable column header: cycles asc → desc → asc. */
  function handleHeaderSort(header) {
    const key = header.dataset.sortKey;

    if (sortState.key === key) {
      sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
      sortState.key = key;
      sortState.direction = 'asc';
    }

    // Update visual indicators on all headers
    dom.sortableHeaders.forEach((th) => {
      th.classList.remove('sort-asc', 'sort-desc');
      const icon = th.querySelector('.sort-icon');
      if (th.dataset.sortKey === sortState.key) {
        th.classList.add(sortState.direction === 'asc' ? 'sort-asc' : 'sort-desc');
        icon.textContent = sortState.direction === 'asc' ? '↑' : '↓';
      } else {
        icon.textContent = '↕';
      }
    });

    renderTable();
  }

  /* ------------------------------------------------------------------ *
   * 7. CSV EXPORT (Blob API)
   * ------------------------------------------------------------------ */

  /** Escapes a single CSV field: wraps in quotes and doubles any internal quotes. */
  function csvEscape(value) {
    const str = String(value ?? '');
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Builds a CSV string from the currently *visible* (filtered) rows, then
   * uses the Blob API to generate a downloadable file client-side —
   * no server round-trip required.
   */
  function exportVisibleRowsToCsv() {
    const rows = getVisibleEntries();

    if (rows.length === 0) {
      showToast('No rows to export — adjust your filters.', 'error');
      return;
    }

    const headers = ['Task Name', 'Week Number', 'Hours Spent', 'Status', 'Notes/Comments'];
    const csvLines = [headers.join(',')];

    rows.forEach((entry) => {
      const line = [
        csvEscape(entry.taskName),
        csvEscape(`Week ${entry.week}`),
        csvEscape(entry.hours),
        csvEscape(entry.status),
        csvEscape(entry.notes),
      ].join(',');
      csvLines.push(line);
    });

    const csvContent = csvLines.join('\n');

    // Create a Blob and trigger a client-side download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'weekly_progress_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Release the object URL after the download has been triggered
    URL.revokeObjectURL(url);

    showToast(`Exported ${rows.length} row${rows.length === 1 ? '' : 's'} to CSV.`);
  }

  /* ------------------------------------------------------------------ *
   * 8. MODAL (Add / Edit entry)
   * ------------------------------------------------------------------ */

  let lastFocusedElement = null;

  function openModal(entryToEdit = null) {
    lastFocusedElement = document.activeElement;
    clearFormErrors();
    dom.entryForm.reset();

    if (entryToEdit) {
      dom.modalTitle.textContent = 'Edit Progress Entry';
      dom.entryId.value = entryToEdit.id;
      dom.taskNameInput.value = entryToEdit.taskName;
      dom.weekNumberInput.value = entryToEdit.week;
      dom.hoursSpentInput.value = entryToEdit.hours;
      dom.statusInput.value = entryToEdit.status;
      dom.notesInput.value = entryToEdit.notes;
    } else {
      dom.modalTitle.textContent = 'Add Progress Entry';
      dom.entryId.value = '';
    }

    dom.modalOverlay.hidden = false;
    dom.taskNameInput.focus();
    document.addEventListener('keydown', handleModalKeydown);
  }

  function closeModal() {
    dom.modalOverlay.hidden = true;
    document.removeEventListener('keydown', handleModalKeydown);
    if (lastFocusedElement) lastFocusedElement.focus();
  }

  function handleModalKeydown(e) {
    if (e.key === 'Escape') closeModal();
  }

  function clearFormErrors() {
    document.querySelectorAll('.form-error').forEach((el) => (el.textContent = ''));
    document.querySelectorAll('.form-group').forEach((el) => el.classList.remove('has-error'));
  }

  function setFieldError(inputId, message) {
    const errorEl = document.getElementById(`${inputId}Error`);
    const groupEl = document.getElementById(inputId).closest('.form-group');
    if (errorEl) errorEl.textContent = message;
    if (groupEl) groupEl.classList.add('has-error');
  }

  /** Validates the entry form; returns true if valid, otherwise displays field errors. */
  function validateForm() {
    clearFormErrors();
    let isValid = true;

    const taskName = dom.taskNameInput.value.trim();
    const week = dom.weekNumberInput.value;
    const hours = dom.hoursSpentInput.value;
    const status = dom.statusInput.value;

    if (!taskName) {
      setFieldError('taskName', 'Task name is required.');
      isValid = false;
    }
    if (!week) {
      setFieldError('weekNumber', 'Please select a week.');
      isValid = false;
    }
    if (hours === '' || Number(hours) < 0) {
      setFieldError('hoursSpent', 'Enter a valid number of hours.');
      isValid = false;
    }
    if (!status) {
      setFieldError('status', 'Please select a status.');
      isValid = false;
    }

    return isValid;
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

    const id = dom.entryId.value;
    const payload = {
      taskName: dom.taskNameInput.value.trim(),
      week: Number(dom.weekNumberInput.value),
      hours: Number(dom.hoursSpentInput.value),
      status: dom.statusInput.value,
      notes: dom.notesInput.value.trim(),
    };

    if (id) {
      // Editing an existing entry
      const index = entries.findIndex((entry) => entry.id === Number(id));
      if (index !== -1) {
        entries[index] = { ...entries[index], ...payload };
        showToast('Entry updated successfully.');
      }
    } else {
      // Adding a new entry
      entries.push({ id: nextId++, ...payload });
      showToast('Entry added successfully.');
    }

    populateWeekFilterOptions();
    renderTable();
    closeModal();
  }

  /* ------------------------------------------------------------------ *
   * 9. DELETE ENTRY
   * ------------------------------------------------------------------ */

  function deleteEntry(id) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;

    const confirmed = window.confirm(`Delete "${entry.taskName}"? This cannot be undone.`);
    if (!confirmed) return;

    entries = entries.filter((e) => e.id !== id);
    populateWeekFilterOptions();
    renderTable();
    showToast('Entry deleted.');
  }

  /* ------------------------------------------------------------------ *
   * 10. TOAST NOTIFICATIONS
   * ------------------------------------------------------------------ */

  let toastTimeout = null;

  function showToast(message, type = 'success') {
    clearTimeout(toastTimeout);
    dom.toast.textContent = message;
    dom.toast.classList.toggle('toast--error', type === 'error');
    dom.toast.hidden = false;

    // Force reflow so the transition triggers reliably
    void dom.toast.offsetWidth;
    dom.toast.classList.add('toast--visible');

    toastTimeout = setTimeout(() => {
      dom.toast.classList.remove('toast--visible');
      setTimeout(() => { dom.toast.hidden = true; }, 220);
    }, 2800);
  }

  /* ------------------------------------------------------------------ *
   * 11. EVENT WIRING / INIT
   * ------------------------------------------------------------------ */

  function wireEvents() {
    // Filters
    dom.filterWeek.addEventListener('change', handleFilterChange);
    dom.filterStatus.addEventListener('change', handleFilterChange);
    dom.filterSearch.addEventListener('input', handleFilterChange);
    dom.resetFiltersBtn.addEventListener('click', resetFilters);
    dom.emptyResetBtn.addEventListener('click', resetFilters);

    // Sorting
    dom.sortableHeaders.forEach((header) => {
      header.setAttribute('tabindex', '0');
      header.addEventListener('click', () => handleHeaderSort(header));
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleHeaderSort(header);
        }
      });
    });

    // CSV export
    dom.exportCsvBtn.addEventListener('click', exportVisibleRowsToCsv);

    // Modal open/close
    dom.addEntryBtn.addEventListener('click', () => openModal());
    dom.modalCloseBtn.addEventListener('click', closeModal);
    dom.modalCancelBtn.addEventListener('click', closeModal);
    dom.modalOverlay.addEventListener('click', (e) => {
      if (e.target === dom.modalOverlay) closeModal();
    });

    // Form submit
    dom.entryForm.addEventListener('submit', handleFormSubmit);

    // Row actions (event delegation for edit/delete)
    dom.tableBody.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;

      const id = Number(btn.dataset.id);
      if (btn.dataset.action === 'edit') {
        const entry = entries.find((en) => en.id === id);
        if (entry) openModal(entry);
      } else if (btn.dataset.action === 'delete') {
        deleteEntry(id);
      }
    });
  }

  /** Seeds the initial state from mock data. */
  function seedData() {
    entries = SEED_DATA.map((item) => ({ id: nextId++, ...item }));
  }

  function init() {
    seedData();
    populateWeekFilterOptions();
    wireEvents();
    renderTable();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
