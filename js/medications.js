document.addEventListener("DOMContentLoaded", () => {
  // This is the canonical medication list for the whole app (what's shown
  // on this page). js/symptoms.js and js/report.js each keep their own
  // copy of this same data (name/dosage at minimum), since there's no
  // shared module system across these plain <script> pages. If you add,
  // remove, or edit a medication here, update those two files to match.
  let medications = [
    {
      id: 1,
      name: "Metformin",
      dosage: "500mg",
      frequency: "Twice daily",
      doctor: "Dr. Amara Chen",
      status: "active",
      notes: "Take with meals to reduce stomach upset.",
    },
    {
      id: 2,
      name: "Ibuprofen",
      dosage: "200mg",
      frequency: "As needed",
      doctor: "Dr. Priya Nair",
      status: "active",
      notes: "",
    },
    {
      id: 3,
      name: "Warfarin",
      dosage: "5mg",
      frequency: "Once daily",
      doctor: "Dr. Miguel Ortiz",
      status: "active",
      notes: "Avoid taking with NSAIDs — bleeding risk.",
    },
    {
      id: 4,
      name: "Paracetamol",
      dosage: "500mg",
      frequency: "Three times daily",
      doctor: "Dr. Sarah Kim",
      status: "active",
      notes: "Take after meals for fever or pain relief.",
    },
    {
      id: 5,
      name: "Aspirin",
      dosage: "400mg",
      frequency: "Twice daily",
      doctor: "Dr. James Okafor",
      status: "active",
      notes: "Take with food — increases bleeding risk when combined with Warfarin.",
    },
  ];

  let nextId = medications.length + 1;
  let editingId = null;

  const tableBody = document.getElementById("medTableBody");
  const emptyState = document.getElementById("emptyState");
  const searchInput = document.getElementById("searchInput");

  const modalOverlay = document.getElementById("medModalOverlay");
  const modalTitle = document.getElementById("modalTitle");
  const modalSubmit = document.getElementById("modalSubmit");
  const medForm = document.getElementById("medForm");

  function render(filterText = "") {
    const query = filterText.trim().toLowerCase();
    const filtered = medications.filter((med) => med.name.toLowerCase().includes(query));

    tableBody.innerHTML = filtered
      .map(
        (med) => `
        <tr data-id="${med.id}">
          <td class="table__primary">${med.name}</td>
          <td class="table__secondary">${med.dosage}</td>
          <td class="table__secondary">${med.frequency}</td>
          <td class="table__secondary">${med.doctor || "—"}</td>
          <td>
            <span class="pill ${med.status === "active" ? "pill--success" : "pill--muted"}">
              ${med.status === "active" ? "Active" : "Paused"}
            </span>
          </td>
          <td>
            <div class="table__actions">
              <button class="icon-btn" data-action="edit" data-id="${med.id}" aria-label="Edit">✏️</button>
              <button class="icon-btn icon-btn--danger" data-action="delete" data-id="${med.id}" aria-label="Delete">🗑️</button>
            </div>
          </td>
        </tr>
      `
      )
      .join("");

    emptyState.hidden = filtered.length > 0;
  }

  searchInput.addEventListener("input", () => render(searchInput.value));

  function openModal(mode, med = null) {
    editingId = med ? med.id : null;
    modalTitle.textContent = mode === "edit" ? "Edit Medication" : "Add Medication";
    modalSubmit.textContent = mode === "edit" ? "Save Changes" : "Add Medication";

    document.getElementById("medId").value = med ? med.id : "";
    document.getElementById("medNameInput").value = med ? med.name : "";
    document.getElementById("medDosageInput").value = med ? med.dosage : "";
    document.getElementById("medFrequencyInput").value = med ? med.frequency : "Once daily";
    document.getElementById("medDoctorInput").value = med ? med.doctor : "";
    document.getElementById("medStatusInput").value = med ? med.status : "active";
    document.getElementById("medNotesInput").value = med ? med.notes : "";

    modalOverlay.classList.add("open");
    document.getElementById("medNameInput").focus();
  }

  function closeModal() {
    modalOverlay.classList.remove("open");
    editingId = null;
  }

  document.getElementById("addMedBtn").addEventListener("click", () => openModal("add"));
  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("modalCancel").addEventListener("click", closeModal);

  modalOverlay.addEventListener("click", (event) => {
    if (event.target === modalOverlay) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  medForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = {
      name: document.getElementById("medNameInput").value.trim(),
      dosage: document.getElementById("medDosageInput").value.trim(),
      frequency: document.getElementById("medFrequencyInput").value,
      doctor: document.getElementById("medDoctorInput").value.trim(),
      status: document.getElementById("medStatusInput").value,
      notes: document.getElementById("medNotesInput").value.trim(),
    };

    if (!data.name || !data.dosage) return;

    if (editingId) {
      medications = medications.map((med) => (med.id === editingId ? { ...med, ...data } : med));
      showToast(`${data.name} updated`);
    } else {
      medications.push({ id: nextId++, ...data });
      showToast(`${data.name} added to your medications`);
    }

    closeModal();
    render(searchInput.value);
  });

  tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = Number(button.dataset.id);
    const med = medications.find((item) => item.id === id);
    if (!med) return;

    if (button.dataset.action === "edit") {
      openModal("edit", med);
    } else if (button.dataset.action === "delete") {
      const confirmed = window.confirm(`Remove ${med.name} from your medications?`);
      if (!confirmed) return;
      medications = medications.filter((item) => item.id !== id);
      showToast(`${med.name} removed`);
      render(searchInput.value);
    }
  });

  function showToast(message) {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    toastMessage.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2800);
  }

  render();
});
