/* ==========================================================================
   SafeX Solutions — Intern Management System ( script.js )
   Vanilla ES6+ JavaScript handling local state, Chart.js analytics,
   dynamic pagination, Blob CSV export, and html2pdf.js PDF report creation.
   ========================================================================== */

(() => {
  'use strict';

  /* ------------------------------------------------------------------ *
   * 1. STATE & STORAGE
   * ------------------------------------------------------------------ */

  const STORAGE_KEY = 'safex_intern_entries_v2';

  const SEED_DATA = [
    { id: 1, taskName: 'Set up project repository & CI pipeline', week: 1, hours: 6, status: 'Completed', notes: 'Configured GitHub Actions workflow.' },
    { id: 2, taskName: 'Onboarding & environment setup', week: 1, hours: 4, status: 'Completed', notes: 'Installed dependencies & IDE plugins.' },
    { id: 3, taskName: 'Build responsive navbar component', week: 2, hours: 8, status: 'Completed', notes: 'Mobile drawer menu added.' },
    { id: 4, taskName: 'Design authentication flow', week: 2, hours: 10, status: 'In Progress', notes: 'Form UI drafted; validation next.' },
    { id: 5, taskName: 'Integrate REST API for user dashboard', week: 3, hours: 7, status: 'In Progress', notes: 'Connecting data endpoints.' },
    { id: 6, taskName: 'Write unit tests for utility functions', week: 3, hours: 5, status: 'Pending', notes: 'Awaiting stable build.' },
    { id: 7, taskName: 'Accessibility audit of core pages', week: 4, hours: 3.5, status: 'Pending', notes: 'Keyboard navigation checks.' },
    { id: 8, taskName: 'Weekly sprint demo preparation', week: 4, hours: 2.5, status: 'Completed', notes: 'Slide deck & live demo ready.' }
  ];

  let entries = [];
  let nextId = 9;

  // Filter state
  const filters = { week: 'all', status: 'all', search: '' };

  // Sort state
  const sortState = { key: null, direction: null };

  // Pagination state
  const pagination = { currentPage: 1, rowsPerPage: 5 };

  // Chart instances
  let weeklyChartInstance = null;
  let statusChartInstance = null;

  /* ------------------------------------------------------------------ *
   * 2. DOM REFERENCES
   * ------------------------------------------------------------------ */

  const dom = {
    tableBody: document.getElementById('tableBody'),
    emptyState: document.getElementById('emptyState'),
    paginationInfo: document.getElementById('paginationInfo'),
    pageIndicator: document.getElementById('pageIndicator'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),
    rowsPerPageSelect: document.getElementById('rowsPerPage'),

    filterWeek: document.getElementById('filterWeek'),
    filterStatus: document.getElementById('filterStatus'),
    filterSearch: document.getElementById('filterSearch'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    emptyResetBtn: document.getElementById('emptyResetBtn'),

    exportCsvBtn: document.getElementById('exportCsvBtn'),
    exportPdfBtn: document.getElementById('exportPdfBtn'),
    addEntryBtn: document.getElementById('addEntryBtn'),

    statHours: document.getElementById('statHours'),
    statCompletionRate: document.getElementById('statCompletionRate'),
    statTotal: document.getElementById('statTotal'),
    statActiveInterns: document.getElementById('statActiveInterns'),

    // Modal elements
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
    exportableArea: document.getElementById('exportableArea') || document.getElementById('report-container'),
    printReportMeta: document.getElementById('printReportMeta')
  };

  /* ------------------------------------------------------------------ *
   * 3. INITIALIZATION & STORAGE LOAD
   * ------------------------------------------------------------------ */

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        entries = JSON.parse(raw);
        nextId = entries.reduce((max, e) => Math.max(max, e.id), 0) + 1;
      } catch (err) {
        entries = [...SEED_DATA];
      }
    } else {
      entries = [...SEED_DATA];
      saveState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  /* ------------------------------------------------------------------ *
   * 4. FILTERING, SORTING & PAGINATION LOGIC
   * ------------------------------------------------------------------ */

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  function statusBadgeClass(status) {
    switch (status) {
      case 'Completed': return 'badge--completed';
      case 'In Progress': return 'badge--in-progress';
      case 'Pending': return 'badge--pending';
      default: return '';
    }
  }

  function populateWeekFilterOptions() {
    const currentVal = dom.filterWeek.value || 'all';
    const distinctWeeks = [...new Set(entries.map((e) => e.week))].sort((a, b) => a - b);
    
    dom.filterWeek.innerHTML = '<option value="all">All Weeks</option>' +
      distinctWeeks.map((w) => `<option value="${w}">Week ${w}</option>`).join('');

    if (currentVal === 'all' || distinctWeeks.includes(Number(currentVal))) {
      dom.filterWeek.value = currentVal;
    } else {
      dom.filterWeek.value = 'all';
      filters.week = 'all';
    }
  }

  function getFilteredAndSortedEntries() {
    let result = entries.filter((entry) => {
      const matchesWeek = filters.week === 'all' || entry.week === Number(filters.week);
      const matchesStatus = filters.status === 'all' || entry.status === filters.status;
      const query = filters.search.toLowerCase();
      const matchesSearch = entry.taskName.toLowerCase().includes(query) || entry.notes.toLowerCase().includes(query);
      return matchesWeek && matchesStatus && matchesSearch;
    });

    if (sortState.key) {
      const orderMap = { Pending: 0, 'In Progress': 1, Completed: 2 };
      result.sort((a, b) => {
        let cmp = 0;
        if (sortState.key === 'taskName') cmp = a.taskName.localeCompare(b.taskName);
        else if (sortState.key === 'week') cmp = a.week - b.week;
        else if (sortState.key === 'hours') cmp = a.hours - b.hours;
        else if (sortState.key === 'status') cmp = orderMap[a.status] - orderMap[b.status];
        return sortState.direction === 'desc' ? -cmp : cmp;
      });
    }

    return result;
  }

  function getPaginatedEntries(allFiltered) {
    const start = (pagination.currentPage - 1) * pagination.rowsPerPage;
    return allFiltered.slice(start, start + pagination.rowsPerPage);
  }

  /* ------------------------------------------------------------------ *
   * 5. RENDERING TABLE & SUMMARY
   * ------------------------------------------------------------------ */

  function renderTable() {
    const filtered = getFilteredAndSortedEntries();
    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pagination.rowsPerPage));

    if (pagination.currentPage > totalPages) {
      pagination.currentPage = totalPages;
    }

    const pageSlice = getPaginatedEntries(filtered);

    if (pageSlice.length === 0) {
      dom.tableBody.innerHTML = '';
      dom.emptyState.hidden = false;
    } else {
      dom.emptyState.hidden = true;
      dom.tableBody.innerHTML = pageSlice.map(rowTemplate).join('');
    }

    // Update Pagination UI
    const startNum = totalCount === 0 ? 0 : (pagination.currentPage - 1) * pagination.rowsPerPage + 1;
    const endNum = Math.min(pagination.currentPage * pagination.rowsPerPage, totalCount);
    
    dom.paginationInfo.textContent = `Showing ${startNum}–${endNum} of ${totalCount} entries`;
    dom.pageIndicator.textContent = `Page ${pagination.currentPage} of ${totalPages}`;
    dom.prevPageBtn.disabled = pagination.currentPage === 1;
    dom.nextPageBtn.disabled = pagination.currentPage === totalPages || totalCount === 0;

    renderSummaryAndCharts();
  }

  function rowTemplate(entry) {
    return `
      <tr data-id="${entry.id}">
        <td class="cell-task">${escapeHtml(entry.taskName)}</td>
        <td>Week ${entry.week}</td>
        <td>${entry.hours}h</td>
        <td><span class="badge ${statusBadgeClass(entry.status)}">${escapeHtml(entry.status)}</span></td>
        <td class="cell-notes">${escapeHtml(entry.notes) || '<span style="color:var(--color-text-muted)">—</span>'}</td>
        <td class="col-actions no-print">
          <div class="row-actions">
            <button type="button" class="icon-btn" data-action="edit" data-id="${entry.id}" aria-label="Edit entry">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>
            </button>
            <button type="button" class="icon-btn icon-btn--delete" data-action="delete" data-id="${entry.id}" aria-label="Delete entry">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }

  /* ------------------------------------------------------------------ *
   * 6. CHART.JS ANALYTICS & SUMMARY RE-CALCULATION
   * ------------------------------------------------------------------ */

  function renderSummaryAndCharts() {
    const filtered = getFilteredAndSortedEntries();
    const total = filtered.length;
    const completed = filtered.filter(e => e.status === 'Completed').length;
    const inProgress = filtered.filter(e => e.status === 'In Progress').length;
    const pending = filtered.filter(e => e.status === 'Pending').length;
    const totalHours = filtered.reduce((acc, e) => acc + Number(e.hours), 0);
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    dom.statHours.textContent = `${totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)}h`;
    dom.statCompletionRate.textContent = `${completionRate}%`;
    dom.statTotal.textContent = total;
    dom.statActiveInterns.textContent = total > 0 ? '1' : '0';

    updateCharts(filtered, completed, inProgress, pending);
  }

  function updateCharts(filteredEntries, completedCount, inProgressCount, pendingCount) {
    // 1. Weekly Chart Data Aggregation
    const weekMap = {};
    filteredEntries.forEach(e => {
      if (!weekMap[e.week]) weekMap[e.week] = { hours: 0, total: 0, completed: 0 };
      weekMap[e.week].hours += Number(e.hours);
      weekMap[e.week].total += 1;
      if (e.status === 'Completed') weekMap[e.week].completed += 1;
    });

    const sortedWeeks = Object.keys(weekMap).sort((a, b) => Number(a) - Number(b));
    const labels = sortedWeeks.map(w => `Week ${w}`);
    const hoursData = sortedWeeks.map(w => weekMap[w].hours);
    const rateData = sortedWeeks.map(w => Math.round((weekMap[w].completed / weekMap[w].total) * 100));

    // Destroy existing instances if re-rendering
    if (weeklyChartInstance) weeklyChartInstance.destroy();
    if (statusChartInstance) statusChartInstance.destroy();

    // Weekly Chart (Combo Bar + Line)
    const ctxWeekly = document.getElementById('weeklyChart').getContext('2d');
    weeklyChartInstance = new Chart(ctxWeekly, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['No Data'],
        datasets: [
          {
            label: 'Hours Logged',
            data: hoursData.length ? hoursData : [0],
            backgroundColor: 'rgba(37, 99, 235, 0.75)',
            borderColor: '#2563eb',
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            label: 'Completion Rate (%)',
            data: rateData.length ? rateData : [0],
            type: 'line',
            borderColor: '#0d9488',
            backgroundColor: '#0d9488',
            borderWidth: 2,
            tension: 0.3,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Inter', size: 11 } } } },
        scales: {
          y: { type: 'linear', position: 'left', title: { display: true, text: 'Hours' }, beginAtZero: true },
          y1: { type: 'linear', position: 'right', title: { display: true, text: 'Completion %' }, min: 0, max: 100, grid: { drawOnChartArea: false } }
        }
      }
    });

    // Status Doughnut Chart
    const ctxStatus = document.getElementById('statusChart').getContext('2d');
    statusChartInstance = new Chart(ctxStatus, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'In Progress', 'Pending'],
        datasets: [{
          data: [completedCount, inProgressCount, pendingCount],
          backgroundColor: ['#16a34a', '#d97706', '#2563eb'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Inter', size: 11 } } } }
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * 7. EXPORT CAPABILITIES (CSV & PDF)
   * ------------------------------------------------------------------ */

  function csvEscape(val) {
    const str = String(val ?? '');
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  }

  function exportCsv() {
    const visible = getFilteredAndSortedEntries();
    if (visible.length === 0) {
      showToast('No visible entries to export.', 'error');
      return;
    }

    const headers = ['Task Name', 'Week', 'Hours', 'Status', 'Notes'];
    const lines = [headers.join(',')];

    visible.forEach(e => {
      lines.push([csvEscape(e.taskName), csvEscape(`Week ${e.week}`), csvEscape(e.hours), csvEscape(e.status), csvEscape(e.notes)].join(','));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safex_weekly_progress_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${visible.length} entries to CSV.`);
  }

/**
 * Robust Executive PDF Report Generator
 */
async function generatePDFReport() {
  // 1. Fallback element resolution
  const element = dom.exportableArea || document.getElementById('report-container') || document.body;

  if (!element) {
    showToast('Error: Printable container not found.', 'error');
    return;
  }

  // 2. Check library availability
  const jsPDFLib = window.jspdf?.jsPDF || window.jsPDF;
  if (typeof html2canvas === 'undefined' || !jsPDFLib) {
    showToast('PDF libraries not loaded. Please check CDN scripts.', 'error');
    console.error('Missing dependencies: Ensure html2canvas and jsPDF are loaded in index.html.');
    return;
  }

  showToast('Generating executive PDF report…');

  if (dom.printReportMeta) {
    dom.printReportMeta.textContent = `Generated on: ${new Date().toLocaleString()}`;
  }

  try {
    // 3. Capture dimensions safely
    const originalScrollTop = window.scrollY;
    window.scrollTo(0, 0); // Reset scroll position to prevent offset bugs

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: (clonedDoc) => {
        // Ensure hidden utility elements or overlays don't block canvas capture in cloned DOM
        const clonedOverlay = clonedDoc.getElementById('modalOverlay');
        if (clonedOverlay) clonedOverlay.style.display = 'none';
      }
    });

    window.scrollTo(0, originalScrollTop); // Restore user scroll position

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDFLib('p', 'mm', 'a4');

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // Render multi-page layout
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`safex_executive_report_${new Date().toISOString().slice(0, 10)}.pdf`);
    showToast('PDF report downloaded successfully!');

  } catch (error) {
    console.error('PDF Generation Error Details:', error);
    showToast('Failed to generate PDF. Check browser console.', 'error');
  }
}

  /* ------------------------------------------------------------------ *
   * 8. MODAL & CRUD ACTIONS
   * ------------------------------------------------------------------ */

  function openModal(entryToEdit = null) {
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
  }

  function closeModal() {
    dom.modalOverlay.hidden = true;
  }

  function clearFormErrors() {
    document.querySelectorAll('.form-error').forEach(e => e.textContent = '');
    document.querySelectorAll('.form-group').forEach(e => e.classList.remove('has-error'));
  }

  function setFieldError(inputId, msg) {
    const errEl = document.getElementById(`${inputId}Error`);
    const groupEl = document.getElementById(inputId).closest('.form-group');
    if (errEl) errEl.textContent = msg;
    if (groupEl) groupEl.classList.add('has-error');
  }

  function validateForm() {
    clearFormErrors();
    let valid = true;
    if (!dom.taskNameInput.value.trim()) { setFieldError('taskName', 'Task name is required.'); valid = false; }
    if (!dom.weekNumberInput.value) { setFieldError('weekNumber', 'Select a week.'); valid = false; }
    if (!dom.hoursSpentInput.value || Number(dom.hoursSpentInput.value) <= 0) { setFieldError('hoursSpent', 'Enter valid hours.'); valid = false; }
    if (!dom.statusInput.value) { setFieldError('status', 'Select a status.'); valid = false; }
    return valid;
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
      notes: dom.notesInput.value.trim()
    };

    if (id) {
      const idx = entries.findIndex(e => e.id === Number(id));
      if (idx !== -1) {
        entries[idx] = { ...entries[idx], ...payload };
        showToast('Entry updated successfully.');
      }
    } else {
      entries.push({ id: nextId++, ...payload });
      showToast('New entry created.');
    }

    saveState();
    populateWeekFilterOptions();
    renderTable();
    closeModal();
  }

  function deleteEntry(id) {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    if (confirm(`Are you sure you want to delete "${entry.taskName}"?`)) {
      entries = entries.filter(e => e.id !== id);
      saveState();
      populateWeekFilterOptions();
      renderTable();
      showToast('Entry deleted.');
    }
  }

  /* ------------------------------------------------------------------ *
   * 9. TOAST NOTIFICATIONS
   * ------------------------------------------------------------------ */

  let toastTimer = null;
  function showToast(msg, type = 'success') {
    clearTimeout(toastTimer);
    dom.toast.textContent = msg;
    dom.toast.classList.toggle('toast--error', type === 'error');
    dom.toast.hidden = false;
    void dom.toast.offsetWidth;
    dom.toast.classList.add('toast--visible');
    toastTimer = setTimeout(() => {
      dom.toast.classList.remove('toast--visible');
      setTimeout(() => dom.toast.hidden = true, 220);
    }, 2800);
  }

  /* ------------------------------------------------------------------ *
   * 10. EVENT LISTENERS
   * ------------------------------------------------------------------ */

  function wireEvents() {
    // Filters & Search
    dom.filterWeek.addEventListener('change', () => { filters.week = dom.filterWeek.value; pagination.currentPage = 1; renderTable(); });
    dom.filterStatus.addEventListener('change', () => { filters.status = dom.filterStatus.value; pagination.currentPage = 1; renderTable(); });
    dom.filterSearch.addEventListener('input', () => { filters.search = dom.filterSearch.value; pagination.currentPage = 1; renderTable(); });
    
    const reset = () => {
      dom.filterWeek.value = 'all'; dom.filterStatus.value = 'all'; dom.filterSearch.value = '';
      filters.week = 'all'; filters.status = 'all'; filters.search = '';
      pagination.currentPage = 1;
      renderTable();
    };
    dom.resetFiltersBtn.addEventListener('click', reset);
    dom.emptyResetBtn.addEventListener('click', reset);

    // Sorting
    dom.sortableHeaders.forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sortKey;
        if (sortState.key === key) {
          sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
          sortState.key = key; sortState.direction = 'asc';
        }
        dom.sortableHeaders.forEach(h => {
          h.classList.remove('sort-asc', 'sort-desc');
          h.querySelector('.sort-icon').textContent = '↕';
        });
        th.classList.add(sortState.direction === 'asc' ? 'sort-asc' : 'sort-desc');
        th.querySelector('.sort-icon').textContent = sortState.direction === 'asc' ? '↑' : '↓';
        renderTable();
      });
    });

    // Pagination
    dom.prevPageBtn.addEventListener('click', () => { if (pagination.currentPage > 1) { pagination.currentPage--; renderTable(); } });
    dom.nextPageBtn.addEventListener('click', () => { pagination.currentPage++; renderTable(); });
    dom.rowsPerPageSelect.addEventListener('change', () => {
      pagination.rowsPerPage = Number(dom.rowsPerPageSelect.value);
      pagination.currentPage = 1;
      renderTable();
    });

    // Exports & Modal Triggers
    dom.exportCsvBtn.addEventListener('click', exportCsv);
    dom.exportPdfBtn.addEventListener('click', generatePDFReport);
    dom.addEntryBtn.addEventListener('click', () => openModal());
    dom.modalCloseBtn.addEventListener('click', closeModal);
    dom.modalCancelBtn.addEventListener('click', closeModal);
    dom.entryForm.addEventListener('submit', handleFormSubmit);

    // Table Actions (Edit / Delete)
    dom.tableBody.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = Number(btn.dataset.id);
      if (btn.dataset.action === 'edit') {
        const item = entries.find(x => x.id === id);
        if (item) openModal(item);
      } else if (btn.dataset.action === 'delete') {
        deleteEntry(id);
      }
    });
  }

  function init() {
    loadState();
    populateWeekFilterOptions();
    wireEvents();
    renderTable();
  }

  document.addEventListener('DOMContentLoaded', init);
})();