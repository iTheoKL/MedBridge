document.addEventListener("DOMContentLoaded", () => {
  // Canonical list of the 5 medications tracked across the app. This is
  // the same list defined in js/medications.js (see the note at the top
  // of that file) — kept as its own copy here since there's no shared
  // module system across these plain <script> pages. If you add, remove,
  // or rename a medication in js/medications.js, update this list to match.
  const MEDICATIONS = [
    { id: 1, name: "Metformin" },
    { id: 2, name: "Ibuprofen" },
    { id: 3, name: "Warfarin" },
    { id: 4, name: "Paracetamol" },
    { id: 5, name: "Aspirin" },
  ];

  // Curated demo interaction data covering every possible pair among the
  // 5 medications above (10 combinations). "level" drives the visual
  // treatment: "danger" (high risk), "warning" (moderate risk), or
  // "safe" (no known / minor interaction). This is a demo dataset, not a
  // clinical database — see the disclaimer banner on the page.
  const INTERACTIONS = {
    "ibuprofen|warfarin": {
      level: "danger",
      label: "High Risk",
      text: "Combining Warfarin with Ibuprofen significantly increases the risk of serious bleeding. This combination is generally avoided — talk to a doctor before taking them together.",
    },
    "aspirin|warfarin": {
      level: "danger",
      label: "High Risk",
      text: "Combining Warfarin with Aspirin significantly increases the risk of serious bleeding. This combination is generally avoided — talk to a doctor before taking them together.",
    },
    "aspirin|ibuprofen": {
      level: "warning",
      label: "Moderate Risk",
      text: "Taking Aspirin and Ibuprofen together increases the risk of gastrointestinal bleeding. Ibuprofen may also blunt Aspirin's heart-protective effect if the doses are timed too close together.",
    },
    "ibuprofen|metformin": {
      level: "warning",
      label: "Moderate Risk",
      text: "Ibuprofen (an NSAID) can reduce kidney function with regular use, which may affect how Metformin is cleared from the body. Kidney function should be monitored.",
    },
    "metformin|warfarin": {
      level: "safe",
      label: "No Known Interaction",
      text: "No significant interaction is known between Metformin and Warfarin.",
    },
    "metformin|paracetamol": {
      level: "safe",
      label: "No Known Interaction",
      text: "No significant interaction is known between Metformin and Paracetamol.",
    },
    "aspirin|metformin": {
      level: "warning",
      label: "Moderate Risk",
      text: "Aspirin, especially at higher doses, may enhance the blood-sugar-lowering effect of Metformin. Watch for symptoms of low blood sugar (hypoglycemia).",
    },
    "ibuprofen|paracetamol": {
      level: "safe",
      label: "No Known Interaction",
      text: "These are commonly used together for pain relief and no significant interaction is known between them.",
    },
    "paracetamol|warfarin": {
      level: "warning",
      label: "Moderate Risk",
      text: "Regular or high-dose Paracetamol use can enhance Warfarin's blood-thinning effect, raising bleeding risk. Occasional, low-dose use is generally considered lower-risk, but frequent use should be discussed with a doctor.",
    },
    "aspirin|paracetamol": {
      level: "warning",
      label: "Minor Risk",
      text: "Combining these can add extra strain on the liver and stomach, especially with frequent or high-dose use. Occasional combined use is generally considered low-risk.",
    },
  };

  const LEVEL_META = {
    danger: { icon: "⚠️", groupClass: "result-group--danger", titleClass: "result-group__title--danger" },
    warning: { icon: "⚡", groupClass: "result-group--warning", titleClass: "result-group__title--warning" },
    safe: { icon: "✅", groupClass: "result-group--safe", titleClass: "result-group__title--safe" },
  };

  function pairKey(nameA, nameB) {
    return [nameA.toLowerCase(), nameB.toLowerCase()].sort().join("|");
  }

  function lookupInteraction(nameA, nameB) {
    return INTERACTIONS[pairKey(nameA, nameB)];
  }

  // ---- State ----
  let selected = []; // array of medication names currently in the manual checker

  // ---- Elements ----
  const yourMedsList = document.getElementById("yourMedsList");
  const drugSelect = document.getElementById("drugSelect");
  const addDrugBtn = document.getElementById("addDrugBtn");
  const manualChips = document.getElementById("manualChips");
  const manualEmptyHint = document.getElementById("manualEmptyHint");
  const checkBtn = document.getElementById("checkBtn");
  const clearBtn = document.getElementById("clearBtn");
  const checkMineBtn = document.getElementById("checkMineBtn");
  const resultsCard = document.getElementById("resultsCard");
  const resultsSummary = document.getElementById("resultsSummary");
  const resultsList = document.getElementById("resultsList");

  // ---- "Your Medications" panel ----
  function renderYourMeds() {
    yourMedsList.innerHTML = MEDICATIONS.map((med) => `<span class="chip">${med.name}</span>`).join("");
  }

  // ---- Manual checker ----
  function availableMeds() {
    return MEDICATIONS.filter((med) => !selected.includes(med.name));
  }

  function renderDrugSelect() {
    const available = availableMeds();

    if (available.length === 0) {
      drugSelect.innerHTML = `<option value="">All medications added</option>`;
      drugSelect.disabled = true;
      addDrugBtn.disabled = true;
      return;
    }

    drugSelect.disabled = false;
    addDrugBtn.disabled = false;
    drugSelect.innerHTML = available.map((med) => `<option value="${med.name}">${med.name}</option>`).join("");
  }

  function renderChips() {
    if (selected.length === 0) {
      manualChips.innerHTML = "";
      manualEmptyHint.hidden = false;
    } else {
      manualEmptyHint.hidden = true;
      manualChips.innerHTML = selected
        .map(
          (name) => `
          <span class="chip">
            ${name}
            <button type="button" class="chip__remove" data-name="${name}" aria-label="Remove ${name}">&times;</button>
          </span>
        `
        )
        .join("");
    }

    checkBtn.disabled = selected.length < 2;
  }

  function addMedication(name) {
    if (!name || selected.includes(name)) return;
    selected.push(name);
    renderDrugSelect();
    renderChips();
    resultsCard.hidden = true;
  }

  function removeMedication(name) {
    selected = selected.filter((med) => med !== name);
    renderDrugSelect();
    renderChips();
    if (selected.length < 2) resultsCard.hidden = true;
  }

  function clearAll() {
    if (selected.length === 0) return;
    selected = [];
    renderDrugSelect();
    renderChips();
    resultsCard.hidden = true;
    showToast("Cleared", "🧹");
  }

  // ---- Results ----
  function checkInteractions() {
    if (selected.length < 2) return;

    const pairs = [];
    for (let i = 0; i < selected.length; i++) {
      for (let j = i + 1; j < selected.length; j++) {
        const interaction = lookupInteraction(selected[i], selected[j]);
        if (interaction) {
          pairs.push({ a: selected[i], b: selected[j], ...interaction });
        }
      }
    }

    const order = { danger: 0, warning: 1, safe: 2 };
    pairs.sort((x, y) => order[x.level] - order[y.level]);

    const dangerCount = pairs.filter((p) => p.level === "danger").length;
    const warningCount = pairs.filter((p) => p.level === "warning").length;
    const safeCount = pairs.filter((p) => p.level === "safe").length;

    const parts = [];
    if (dangerCount) parts.push(`${dangerCount} high risk`);
    if (warningCount) parts.push(`${warningCount} moderate risk`);
    if (safeCount) parts.push(`${safeCount} with no known interaction`);

    resultsSummary.textContent = `Checked ${selected.length} medications across ${pairs.length} combination${
      pairs.length === 1 ? "" : "s"
    }: ${parts.join(", ")}.`;

    resultsList.innerHTML = pairs
      .map((pair) => {
        const meta = LEVEL_META[pair.level];
        return `
          <div class="result-group ${meta.groupClass}">
            <div class="result-group__header">
              <span class="result-group__icon">${meta.icon}</span>
              <h3 class="result-group__title ${meta.titleClass}">${pair.a} + ${pair.b} — ${pair.label}</h3>
            </div>
            <p class="result-group__text">${pair.text}</p>
          </div>
        `;
      })
      .join("");

    resultsCard.hidden = false;
    resultsCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ---- Events ----
  addDrugBtn.addEventListener("click", () => {
    addMedication(drugSelect.value);
  });

  manualChips.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-name]");
    if (!button) return;
    removeMedication(button.dataset.name);
  });

  checkBtn.addEventListener("click", checkInteractions);
  clearBtn.addEventListener("click", clearAll);

  checkMineBtn.addEventListener("click", () => {
    selected = MEDICATIONS.map((med) => med.name);
    renderDrugSelect();
    renderChips();
    checkInteractions();
  });

  // ---- Toast (same pattern as js/medications.js) ----
  function showToast(message, icon = "✅") {
    const toast = document.getElementById("toast");
    const toastIcon = toast.querySelector(".toast__icon");
    const toastMessage = document.getElementById("toastMessage");
    toastIcon.textContent = icon;
    toastMessage.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2800);
  }

  // ---- Init ----
  renderYourMeds();
  renderDrugSelect();
  renderChips();
});
