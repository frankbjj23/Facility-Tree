// ----- 1) master flow: this is the "family tree" of the case -----
const CASE_FLOW = {
  id: "arrested",
  label: "Arrested / Booked",
  children: [
    {
      id: "arraignment",
      label: "Arraignment / First Appearance",
      children: [
        { id: "bail_granted", label: "Bail Granted / Released" },
        { id: "bail_denied", label: "Bail Denied / Remain in Custody" },
        { id: "adjourned", label: "Adjourned / New Date" },
        {
          id: "plea",
          label: "Plea Deal",
          children: [
            { id: "probation", label: "Probation / Supervision" },
            { id: "state_sentence", label: "Sentenced to State DOC" },
          ],
        },
        { id: "trial", label: "Trial" },
      ],
    },
  ],
};

// ----- 2) get DOM elements -----
const caseForm = document.getElementById("caseForm");
const caseList = document.getElementById("caseList");
const currentStageSelect = document.getElementById("currentStage");
const caseMeta = document.getElementById("caseMeta");
const treeContainer = document.getElementById("treeContainer");
const compactToggle = document.getElementById("compactToggle");

const STORAGE_KEY = "family-case-tree-cases";

let cases = [];
let activeIndex = -1;

// ----- 3) turn the tree into a flat list for the dropdown -----
function flattenFlow(node, acc = []) {
  acc.push({ id: node.id, label: node.label });
  if (node.children && node.children.length) {
    node.children.forEach((child) => flattenFlow(child, acc));
  }
  return acc;
}

function populateStageDropdown() {
  const stages = flattenFlow(CASE_FLOW);
  currentStageSelect.innerHTML = "";
  stages.forEach((stage) => {
    const opt = document.createElement("option");
    opt.value = stage.id;
    opt.textContent = stage.label;
    currentStageSelect.appendChild(opt);
  });
}

// ----- 4) build the tree UI -----
function buildTreeUL(node, currentStageId, compact) {
  const ul = document.createElement("ul");
  ul.className = compact ? "tree-ul tree-ul--compact" : "tree-ul";

  const li = document.createElement("li");
  const box = document.createElement("div");
  box.className = "tree-node";
  box.textContent = node.label;

  if (node.id === currentStageId) {
    box.classList.add("tree-node--active");
  }

  li.appendChild(box);

  if (node.children && node.children.length) {
    const childrenUL = document.createElement("ul");
    childrenUL.className = compact ? "tree-ul tree-ul--compact" : "tree-ul";

    node.children.forEach((child) => {
      const childLI = buildTreeUL(
        child,
        currentStageId,
        compact
      ).firstElementChild;
      childrenUL.appendChild(childLI);
    });

    li.appendChild(childrenUL);
  }

  ul.appendChild(li);
  return ul;
}

function renderTree(container, flow, currentStageId, compact = false) {
  container.innerHTML = "";
  const ul = buildTreeUL(flow, currentStageId, compact);
  container.appendChild(ul);
}

// Scale the tree to fit the available width in the scroll container
function fitTreeToWidth() {
  const scrollEl = document.getElementById("treeScroll");
  const treeEl = document.getElementById("treeContainer");
  if (!scrollEl || !treeEl) return;
  // reset any previous transform before measuring
  treeEl.style.transform = "";
  treeEl.style.transformOrigin = "top left";

  const available = scrollEl.clientWidth - 16; // account for inner padding
  const content = treeEl.scrollWidth;
  if (content > available && available > 0) {
    const scale = Math.max(available / content, 0.65);
    treeEl.style.transform = `scale(${scale})`;
  }
}

// ----- 5) storage helpers -----
function loadCases() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveCases() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
}

// ----- 6) render the list on the left -----
function renderCaseList() {
  caseList.innerHTML = "";
  cases.forEach((c, idx) => {
    const li = document.createElement("li");
    li.className =
      idx === activeIndex
        ? "case-list__item case-list__item--active"
        : "case-list__item";
    li.innerHTML = `
      <img src="./images/Gavel-icon.png" alt="" class="case-list__icon" onerror="this.style.display='none'">
      <div>
        <div class="case-list__name">${c.fullName}</div>
        <div class="case-list__sub">${c.facility || ""}</div>
      </div>
    `;
    li.addEventListener("click", () => {
      setActiveCase(idx);
    });
    caseList.appendChild(li);
  });
}

// ----- 7) load a case into the form + tree -----
function setActiveCase(idx) {
  activeIndex = idx;
  renderCaseList();

  const c = cases[idx];
  if (!c) {
    caseMeta.textContent = "No case loaded.";
    treeContainer.innerHTML = "";
    return;
  }

  document.getElementById("caseIndex").value = idx;
  document.getElementById("fullName").value = c.fullName;
  document.getElementById("dob").value = c.dob;
  document.getElementById("custodyType").value = c.custodyType;
  document.getElementById("facility").value = c.facility;
  document.getElementById("nextCourtDate").value = c.nextCourtDate || "";
  currentStageSelect.value = c.currentStage || CASE_FLOW.id;

  caseMeta.textContent = `${c.fullName} • ${
    c.facility || "No facility"
  } • Next court: ${c.nextCourtDate || "N/A"}`;

  renderTree(treeContainer, CASE_FLOW, c.currentStage, compactToggle.checked);
  fitTreeToWidth();
}

// ----- 8) form submit -----
caseForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const idx = parseInt(document.getElementById("caseIndex").value, 10);
  const newCase = {
    fullName: document.getElementById("fullName").value,
    dob: document.getElementById("dob").value,
    custodyType: document.getElementById("custodyType").value,
    facility: document.getElementById("facility").value,
    nextCourtDate: document.getElementById("nextCourtDate").value,
    currentStage: document.getElementById("currentStage").value,
  };

  if (!Number.isNaN(idx) && idx >= 0) {
    cases[idx] = newCase;
    activeIndex = idx;
  } else {
    cases.push(newCase);
    activeIndex = cases.length - 1;
  }

  saveCases();
  renderCaseList();
  setActiveCase(activeIndex);
});

// ----- 9) new case button -----
document.getElementById("newCaseBtn").addEventListener("click", () => {
  document.getElementById("caseIndex").value = -1;
  caseForm.reset();
  currentStageSelect.value = CASE_FLOW.id;
  caseMeta.textContent = "New case…";
  treeContainer.innerHTML = "";
});

// ----- 10) delete case button -----
document.getElementById("deleteCaseBtn").addEventListener("click", () => {
  if (activeIndex < 0) return;
  cases.splice(activeIndex, 1);
  saveCases();
  activeIndex = cases.length ? 0 : -1;
  renderCaseList();
  if (activeIndex >= 0) {
    setActiveCase(activeIndex);
  } else {
    caseMeta.textContent = "No case loaded.";
    treeContainer.innerHTML = "";
  }
});

// ----- 11) compact toggle -----
compactToggle.addEventListener("change", () => {
  if (activeIndex < 0) return;
  const c = cases[activeIndex];
  renderTree(treeContainer, CASE_FLOW, c.currentStage, compactToggle.checked);
  fitTreeToWidth();
});

// ----- 12) init -----
function init() {
  // fill dropdown FIRST
  populateStageDropdown();

  // load saved cases
  cases = loadCases();

  // if none, create a sample one
  if (!cases.length) {
    cases = [
      {
        fullName: "Sample Inmate",
        dob: "1990-01-01",
        custodyType: "county",
        facility: "Bergen County Jail",
        nextCourtDate: "2025-12-01",
        currentStage: "arraignment",
      },
    ];
    saveCases();
  }

  // Default to compact mode on first load (denser tree on desktop too)
  if (compactToggle) {
    compactToggle.checked = true;
  }

  renderCaseList();
  setActiveCase(0);
  window.addEventListener("resize", fitTreeToWidth);
}

init();

