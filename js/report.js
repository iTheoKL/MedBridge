document.addEventListener("DOMContentLoaded", () => {
  // Canonical medication list — keep this in sync with js/medications.js.
  const MEDICATIONS = [
    { name: "Metformin", dosage: "500mg", frequency: "Twice daily", doctor: "Dr. Amara Chen" },
    { name: "Ibuprofen", dosage: "200mg", frequency: "As needed", doctor: "Dr. Priya Nair" },
    { name: "Warfarin", dosage: "5mg", frequency: "Once daily", doctor: "Dr. Miguel Ortiz" },
    { name: "Paracetamol", dosage: "500mg", frequency: "Three times daily", doctor: "Dr. Sarah Kim" },
    { name: "Aspirin", dosage: "400mg", frequency: "Twice daily", doctor: "Dr. James Okafor" },
  ];

  const ADHERENCE = {
    period: "Last 30 days",
    takenPercent: 95,
    taken: 256,
    missed: 14,
    totalDoses: 270,
  };

  const SYMPTOM_NOTES = [
    { symptom: "Nausea", relatedTo: "Metformin, Ibuprofen, Warfarin, Paracetamol, Aspirin" },
    { symptom: "Stomach pain", relatedTo: "Metformin, Ibuprofen, Aspirin" },
    { symptom: "Easy bruising / bleeding risk", relatedTo: "Warfarin, Aspirin" },
    { symptom: "Fatigue", relatedTo: "Metformin, Warfarin" },
  ];

  // Kept in sync with the interaction list shown on index.html.
  const INTERACTIONS = [
    { pair: "Warfarin + Ibuprofen", severity: "High", note: "Increased bleeding potential." },
    { pair: "Warfarin + Aspirin", severity: "High", note: "Increased bleeding potential." },
    { pair: "Aspirin + Ibuprofen", severity: "Moderate", note: "Increased gastrointestinal bleeding risk." },
    { pair: "Metformin + Ibuprofen", severity: "Moderate", note: "Monitor kidney function." },
    { pair: "Metformin + Warfarin", severity: "None", note: "No known interaction." },
  ];

  const medTableBody = document.getElementById("reportMedTableBody");
  const fromDate = document.getElementById("fromDate");
  const toDate = document.getElementById("toDate");
  const reportForm = document.getElementById("reportForm");
  const recentReports = document.getElementById("recentReports");

  // ---------------------------------------------------------------------
  // Show the data the report will be built from
  // ---------------------------------------------------------------------
  function renderMedications() {
    if (!medTableBody) return;
    medTableBody.innerHTML = MEDICATIONS.map(
      (med) => `
        <tr>
          <td class="table__primary">${med.name}</td>
          <td class="table__secondary">${med.dosage}</td>
          <td class="table__secondary">${med.frequency}</td>
          <td class="table__secondary">${med.doctor}</td>
        </tr>
      `
    ).join("");
  }

  // Default range: start of this month -> today
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  toDate.value = today.toISOString().split("T")[0];
  fromDate.value = startOfMonth.toISOString().split("T")[0];

  // ---------------------------------------------------------------------
  // Build the downloadable report
  // ---------------------------------------------------------------------
  function buildReportText(sections, from, to) {
    const lines = [];
    lines.push("MedBridge Health Report");
    lines.push(`Period: ${from} to ${to}`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push("=".repeat(48));

    if (sections.includes("medications")) {
      lines.push("\nMEDICATIONS LIST");
      lines.push("-".repeat(48));
      MEDICATIONS.forEach((med) => {
        lines.push(`${med.name} — ${med.dosage} — ${med.frequency} — Prescribed by ${med.doctor}`);
      });
    }

    if (sections.includes("reminders")) {
      lines.push("\nREMINDER HISTORY & ADHERENCE");
      lines.push("-".repeat(48));
      lines.push(
        `${ADHERENCE.period}: ${ADHERENCE.takenPercent}% adherence ` +
          `(${ADHERENCE.taken} taken, ${ADHERENCE.missed} missed of ${ADHERENCE.totalDoses} scheduled doses)`
      );
    }

    if (sections.includes("symptoms")) {
      lines.push("\nSYMPTOM LOG");
      lines.push("-".repeat(48));
      SYMPTOM_NOTES.forEach((entry) => {
        lines.push(`${entry.symptom} — possibly related to: ${entry.relatedTo}`);
      });
    }

    if (sections.includes("interactions")) {
      lines.push("\nDRUG INTERACTION WARNINGS");
      lines.push("-".repeat(48));
      INTERACTIONS.forEach((entry) => {
        lines.push(`${entry.pair} — ${entry.severity} risk — ${entry.note}`);
      });
    }

    lines.push("\n" + "=".repeat(48));
    lines.push(
      "This report was generated automatically by MedBridge and is not a substitute for professional medical advice."
    );

    return lines.join("\n");
  }

  reportForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const sections = Array.from(reportForm.querySelectorAll("input[type='checkbox']:checked")).map(
      (input) => input.value
    );

    if (sections.length === 0) {
      showToast("Select at least one section to include");
      return;
    }

    const from = fromDate.value || "N/A";
    const to = toDate.value || "N/A";
    const reportText = buildReportText(sections, from, to);

    // Actually trigger a real file download — no server involved.
    const blob = new Blob([reportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const filename = `medbridge-report-${from}-to-${to}.txt`;

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addToRecentReports(from, to);
    showToast("Report downloaded");
  });

  function addToRecentReports(from, to) {
    const item = document.createElement("li");
    item.className = "report-item";
    item.innerHTML = `
      <span class="report-item__icon">📄</span>
      <div class="report-item__body">
        <p class="report-item__name">Health Report — ${from} to ${to}</p>
        <p class="report-item__meta">Generated just now</p>
      </div>
      <button class="icon-btn" aria-label="Download" disabled>⬇</button>
    `;
    recentReports.prepend(item);
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    toastMessage.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2800);
  }

  renderMedications();
});
