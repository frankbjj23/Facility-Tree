// Base CASE FLOW definition
const CASE_FLOW = {
  id: 'arrested',
  label: 'Arrested / Booked',
  children: [
    {
      id: 'arraignment',
      label: 'Arraignment / First Appearance',
      children: [
        { id: 'bail_granted', label: 'Bail Granted / Released' },
        { id: 'bail_denied', label: 'Bail Denied / Remain in Custody' },
        { id: 'adjourned', label: 'Adjourned / New Date' },
        {
          id: 'plea',
          label: 'Plea Deal',
          children: [
            { id: 'probation', label: 'Probation / Supervision' },
            { id: 'state_sentence', label: 'Sentenced to State DOC' }
          ]
        },
        { id: 'trial', label: 'Trial' }
      ]
    }
  ]
};

const LS_KEY = "family-case-tree-cases";
const LS_COMPACT = "family-case-tree-compact";
let cases = [];
let currentCaseIndex = -1;

// Traverse the flow tree
function traverseFlow(node, cb, depth = 0) {
  cb(node, depth);
  if (Array.isArray(node.children)) {
    node.children.forEach(child => traverseFlow(child, cb, depth + 1));
  }
}

// Build stage options from flow
function buildStageOptions(flow, selectElement) {
  // Clear existing
  while (selectElement.firstChild) selectElement.removeChild(selectElement.firstChild);

  const fr = document.createDocumentFragment();
  traverseFlow(flow, (node, depth) => {
    const opt = document.createElement('option');
    const indent = '— '.repeat(depth);
    opt.value = node.id;
    opt.textContent = `${indent}${node.label}`;
    fr.appendChild(opt);
  });
  selectElement.appendChild(fr);
}

// Build the nested UL/LI for the tree
function renderTree(container, flow, currentStageId) {
  container.innerHTML = '';

  function buildNode(node) {
    const li = document.createElement('li');

    const box = document.createElement('div');
    box.className = 'node' + (node.id === currentStageId ? ' node--active' : '');
    const title = document.createElement('p');
    title.className = 'node__label';
    title.textContent = node.label;
    const meta = document.createElement('p');
    meta.className = 'node__meta';
    meta.textContent = `Stage ID: ${node.id}`;

    box.appendChild(title);
    box.appendChild(meta);
    li.appendChild(box);

    if (node.children && node.children.length > 0) {
      const ul = document.createElement('ul');
      node.children.forEach(child => ul.appendChild(buildNode(child)));
      li.appendChild(ul);
    }
    return li;
  }

  const rootUl = document.createElement('ul');
  rootUl.appendChild(buildNode(flow));
  container.appendChild(rootUl);
}

// Storage helpers
function loadCases() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}
  return [];
}

function saveCases() {
  localStorage.setItem(LS_KEY, JSON.stringify(cases));
}

// UI helpers
function clearForm() {
  document.getElementById('caseIndex').value = -1;
  document.getElementById('fullName').value = '';
  document.getElementById('dob').value = '';
  document.getElementById('custodyType').value = 'county';
  document.getElementById('facility').value = '';
  document.getElementById('nextCourtDate').value = '';
  document.getElementById('currentStage').value = CASE_FLOW.id;
}

function fillFormFromCase(c) {
  document.getElementById('fullName').value = c.fullName || '';
  document.getElementById('dob').value = c.dob || '';
  document.getElementById('custodyType').value = c.custodyType || 'county';
  document.getElementById('facility').value = c.facility || '';
  document.getElementById('nextCourtDate').value = c.nextCourtDate || '';
  document.getElementById('currentStage').value = c.currentStage || CASE_FLOW.id;
}

function activeCase() {
  return cases[currentCaseIndex] || null;
}

function renderCaseList() {
  const list = document.getElementById('caseList');
  list.innerHTML = '';
  const fr = document.createDocumentFragment();

  cases.forEach((c, idx) => {
    const li = document.createElement('li');
    li.className = 'case-list__item' + (idx === currentCaseIndex ? ' case-list__item--active' : '');
    li.tabIndex = 0;
    li.setAttribute('role', 'button');
    li.setAttribute('aria-label', `Load case ${c.fullName}`);

    const avatar = document.createElement('img');
    avatar.className = 'case-avatar';
    // Use a reliable Wikimedia placeholder
    avatar.src = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
    avatar.alt = 'Case avatar';
    avatar.referrerPolicy = 'no-referrer';

    const text = document.createElement('div');
    text.className = 'case-text';

    const name = document.createElement('div');
    name.className = 'case-name';
    name.textContent = c.fullName;

    const meta = document.createElement('div');
    meta.className = 'case-meta-small';
    const facility = c.facility ? ` • ${c.facility}` : '';
    const nextDate = c.nextCourtDate ? ` • Next: ${c.nextCourtDate}` : '';
    meta.textContent = `${c.custodyType.toUpperCase()}${facility}${nextDate}`;

    text.appendChild(name);
    text.appendChild(meta);

    li.appendChild(avatar);
    li.appendChild(text);

    li.addEventListener('click', () => {
      currentCaseIndex = idx;
      document.getElementById('caseIndex').value = idx;
      fillFormFromCase(cases[idx]);
      updateViewer();
      renderCaseList();
    });
    li.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') li.click();
    });

    fr.appendChild(li);
  });

  list.appendChild(fr);
}

function updateViewer() {
  const meta = document.getElementById('caseMeta');
  const container = document.getElementById('treeContainer');
  const deleteBtn = document.getElementById('deleteCaseBtn');
  const c = activeCase();

  if (!c) {
    meta.textContent = 'No case loaded.';
    container.innerHTML = '';
    if (deleteBtn) deleteBtn.disabled = true;
    return;
  }

  const namePart = c.fullName || 'Unknown';
  const facilityPart = c.facility ? ` • ${c.facility}` : '';
  const courtPart = c.nextCourtDate ? ` • Next Court: ${c.nextCourtDate}` : '';
  meta.textContent = `${namePart}${facilityPart}${courtPart}`;

  renderTree(container, CASE_FLOW, c.currentStage || CASE_FLOW.id);
  if (deleteBtn) deleteBtn.disabled = false;
}

// Init and event listeners
document.addEventListener('DOMContentLoaded', () => {
  const stageSelect = document.getElementById('currentStage');
  const compactToggle = document.getElementById('compactToggle');
  const treeContainer = document.getElementById('treeContainer');
  const deleteBtn = document.getElementById('deleteCaseBtn');
  buildStageOptions(CASE_FLOW, stageSelect);

  cases = loadCases();

  // If none exist, create a sample case
  if (!cases.length) {
    cases.push({
      fullName: 'Sample Inmate',
      dob: '1990-01-01',
      custodyType: 'county',
      facility: 'Bergen County Jail',
      nextCourtDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10),
      currentStage: 'arraignment'
    });
    saveCases();
  }

  currentCaseIndex = 0;
  document.getElementById('caseIndex').value = currentCaseIndex;
  fillFormFromCase(activeCase());

  renderCaseList();
  updateViewer();

  // Initialize compact mode (default ON on small screens if unset)
  try {
    const compactPref = localStorage.getItem(LS_COMPACT);
    let isCompact;
    if (compactPref === null) {
      isCompact = window.innerWidth < 900;
      localStorage.setItem(LS_COMPACT, isCompact ? '1' : '0');
    } else {
      isCompact = compactPref === '1';
    }
    if (compactToggle) compactToggle.checked = isCompact;
    if (isCompact && treeContainer) treeContainer.classList.add('tree--compact');
  } catch (_) {}

  // Save / Update handler
  document.getElementById('caseForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const idx = parseInt(document.getElementById('caseIndex').value, 10);
    const newCase = {
      fullName: document.getElementById('fullName').value.trim(),
      dob: document.getElementById('dob').value,
      custodyType: document.getElementById('custodyType').value,
      facility: document.getElementById('facility').value.trim(),
      nextCourtDate: document.getElementById('nextCourtDate').value,
      currentStage: document.getElementById('currentStage').value
    };

    if (!newCase.fullName) {
      alert('Please enter a full name.');
      return;
    }

    if (Number.isInteger(idx) && idx >= 0 && idx < cases.length) {
      cases[idx] = newCase; // Update
      currentCaseIndex = idx;
    } else {
      cases.push(newCase); // Create
      currentCaseIndex = cases.length - 1;
      document.getElementById('caseIndex').value = currentCaseIndex;
    }

    saveCases();
    renderCaseList();
    updateViewer();
  });

  // New button clears form for new case
  document.getElementById('newCaseBtn').addEventListener('click', () => {
    clearForm();
    currentCaseIndex = -1;
    renderCaseList();
    updateViewer();
  });

  // Change stage preview live for the active case
  stageSelect.addEventListener('change', () => {
    const c = activeCase();
    if (!c) return;
    const preview = { ...c, currentStage: stageSelect.value };
    renderTree(document.getElementById('treeContainer'), CASE_FLOW, preview.currentStage);
  });

  // Compact toggle behavior
  if (compactToggle) {
    compactToggle.addEventListener('change', () => {
      const compact = compactToggle.checked;
      if (treeContainer) {
        treeContainer.classList.toggle('tree--compact', compact);
      }
      try { localStorage.setItem(LS_COMPACT, compact ? '1' : '0'); } catch (_) {}
    });
  }

  // Delete current case
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (currentCaseIndex < 0 || currentCaseIndex >= cases.length) return;
      const name = cases[currentCaseIndex]?.fullName || 'this case';
      if (!confirm(`Delete ${name}? This cannot be undone.`)) return;

      cases.splice(currentCaseIndex, 1);
      saveCases();

      if (cases.length === 0) {
        currentCaseIndex = -1;
        clearForm();
      } else {
        currentCaseIndex = Math.min(currentCaseIndex, cases.length - 1);
        document.getElementById('caseIndex').value = currentCaseIndex;
        fillFormFromCase(activeCase());
      }
      renderCaseList();
      updateViewer();
    });
  }
});
