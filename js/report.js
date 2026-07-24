/*
  report.js — populates report.html with consultation report data and
  wires up the page's common actions (print, back navigation).

  To connect this to live data later, replace the body of
  getReportData() with a fetch() call to your backend/API — none of
  the render functions below need to change as a result.
*/

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const data = await getReportData();
  renderReport(data);
  wireUpActions();
}

// ---------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------

async function getReportData() {
  // Sample data mirroring a generated consultation report.
  // Swap this for: return await fetch('/api/reports/<id>').then(r => r.json());
  return {
    patient: {
      name: 'John Doe',
      age: 68,
      gender: 'Male',
      bloodGroup: 'O+',
      phone: '+91 9876543210'
    },
    medications: [
      { name: 'Metformin', dose: '500 mg', frequency: 'Morning', status: 'ACTIVE' },
      { name: 'Warfarin', dose: '5 mg', frequency: 'Night', status: 'ACTIVE' }
    ],
    adherence: {
      taken: 28,
      missed: 2,
      percent: 93
    },
    symptoms: ['Dizziness', 'Nausea'],
    interaction: {
      severity: 'High',
      details: [
        'Risk of increased bleeding.'
      ]
    },
    caregiver: {
      name: 'David Doe',
      relationship: 'Son',
      alert: 'No Alerts'
    },
    aiRecommendation: 'Based on the available data, the patient has 93% medication adherence. A High drug interaction has been detected. Please consult the treating physician before making any medication changes.'
  };
}

// ---------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------

function renderReport(data) {
  renderPatient(data.patient);
  renderMedications(data.medications);
  renderAdherence(data.adherence);
  renderSymptoms(data.symptoms);
  renderInteraction(data.interaction);
  renderCaregiver(data.caregiver);
  renderRecommendation(data.aiRecommendation);
  renderTimestamp();
}

function renderPatient(patient) {
  setText('patientName', patient.name);
  setText('patientAge', patient.age);
  setText('patientGender', patient.gender);
  setText('patientBloodGroup', patient.bloodGroup);
  setText('patientPhone', patient.phone);
}

function renderMedications(meds) {
  const tbody = document.getElementById('medsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  (meds || []).forEach(med => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(med.name)}</td>
      <td>${escapeHtml(med.dose)}</td>
      <td>${escapeHtml(med.frequency)}</td>
      <td><span class="badge ${statusBadgeClass(med.status)}">${escapeHtml(med.status)}</span></td>
    `;
    tbody.appendChild(row);
  });
}

function statusBadgeClass(status) {
  switch ((status || '').toUpperCase()) {
    case 'ACTIVE': return 'badge-active';
    case 'PAUSED': return 'badge-paused';
    case 'STOPPED': return 'badge-stopped';
    default: return 'badge-default';
  }
}

function renderAdherence(adherence) {
  if (!adherence) return;
  setText('adherenceTaken', adherence.taken);
  setText('adherenceMissed', adherence.missed);
  setText('adherencePercent', `${adherence.percent}%`);
  const fill = document.getElementById('adherenceBarFill');
  if (fill) {
    const pct = Math.min(100, Math.max(0, Number(adherence.percent) || 0));
    fill.style.width = `${pct}%`;
    fill.classList.toggle('adherence-bar__fill--warn', pct < 80);
  }
}

function renderSymptoms(symptoms) {
  const list = document.getElementById('symptomsList');
  if (!list) return;
  list.innerHTML = '';
  if (!symptoms || symptoms.length === 0) {
    const li = document.createElement('li');
    li.className = 'symptom-chip';
    li.textContent = 'No symptoms reported';
    list.appendChild(li);
    return;
  }
  symptoms.forEach(symptom => {
    const li = document.createElement('li');
    li.className = 'symptom-chip';
    li.textContent = symptom;
    list.appendChild(li);
  });
}

function renderInteraction(interaction) {
  const badge = document.getElementById('interactionSeverityBadge');
  const list = document.getElementById('interactionDetailsList');
  if (!interaction) return;

  const severity = interaction.severity || 'None';
  if (badge) {
    badge.textContent = severity;
    badge.className = `severity-badge ${severityBadgeClass(severity)}`;
  }

  if (list) {
    list.innerHTML = '';
    const details = (interaction.details || []).filter(Boolean);
    if (details.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No additional details provided.';
      list.appendChild(li);
      return;
    }
    details.forEach(detail => {
      const li = document.createElement('li');
      li.textContent = detail;
      list.appendChild(li);
    });
  }
}

function severityBadgeClass(severity) {
  switch ((severity || '').toLowerCase()) {
    case 'high': return 'severity-badge--high';
    case 'medium': return 'severity-badge--medium';
    case 'low': return 'severity-badge--low';
    default: return 'severity-badge--none';
  }
}

function renderCaregiver(caregiver) {
  if (!caregiver) return;
  setText('caregiverName', caregiver.name);
  setText('caregiverRelationship', caregiver.relationship);
  setText('caregiverAlert', caregiver.alert);
}

function renderRecommendation(text) {
  setText('aiRecommendationText', text);
}

function renderTimestamp() {
  const el = document.getElementById('reportGeneratedAt');
  if (el) {
    el.textContent = `Generated on ${new Date().toLocaleString()}`;
  }
}

// ---------------------------------------------------------------------
// Common page actions
// ---------------------------------------------------------------------

function wireUpActions() {
  const printBtn = document.getElementById('printReportBtn');
  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = (value === undefined || value === null || value === '') ? '—' : value;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
