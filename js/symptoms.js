document.addEventListener("DOMContentLoaded", () => {
  // ---------------------------------------------------------------------
  // Mock data — in a real app this would come from the user's saved
  // medication list (see medications.html) and a proper drug database.
  //
  // NOTE: name/dose here are intentionally kept in sync with the
  // canonical list in js/medications.js (and js/report.js). There's no
  // shared module system across these plain <script> pages, so if you
  // add/remove/edit a medication in js/medications.js, update the
  // sideEffects list here too.
  // ---------------------------------------------------------------------
  const currentMedications = [
    {
      name: "Metformin",
      dose: "500mg",
      sideEffects: [
        "nausea",
        "vomiting",
        "diarrhea",
        "stomach pain",
        "loss of appetite",
        "metallic taste",
        "fatigue",
      ],
    },
    {
      name: "Ibuprofen",
      dose: "200mg",
      sideEffects: [
        "stomach pain",
        "heartburn",
        "dizziness",
        "rash",
        "headache",
        "nausea",
        "bloating",
      ],
    },
    {
      name: "Warfarin",
      dose: "5mg",
      sideEffects: [
        "easy bruising",
        "bleeding gums",
        "blood in urine",
        "fatigue",
        "hair loss",
        "nausea",
      ],
    },
    {
      name: "Paracetamol",
      dose: "500mg",
      sideEffects: [
        "nausea",
        "rash",
        "loss of appetite",
        "stomach pain",
        "dark urine",
        "yellowing of skin or eyes",
      ],
    },
    {
      name: "Aspirin",
      dose: "400mg",
      sideEffects: [
        "stomach pain",
        "heartburn",
        "nausea",
        "easy bruising",
        "ringing in ears",
        "dizziness",
        "black stools",
      ],
    },
  ];

  const symptoms = [];

  const symptomForm = document.getElementById("symptomForm");
  const symptomInput = document.getElementById("symptomInput");
  const symptomChips = document.getElementById("symptomChips");
  const emptyHint = document.getElementById("emptyHint");
  const checkSymptomsBtn = document.getElementById("checkSymptomsBtn");
  const medReference = document.getElementById("medReference");
  const results = document.getElementById("results");
  const resultsPlaceholder = document.getElementById("resultsPlaceholder");

  // ---------------------------------------------------------------------
  // Render medication reference list
  // ---------------------------------------------------------------------
  function renderMedReference() {
    medReference.innerHTML = currentMedications
      .map(
        (med) => `
        <div class="med-reference-item">
          <p class="med-reference-item__name">${med.name} — ${med.dose}</p>
          <ul class="med-reference-item__list">
            ${med.sideEffects.map((effect) => `<li>${capitalize(effect)}</li>`).join("")}
          </ul>
        </div>
      `
      )
      .join("");
  }

  // ---------------------------------------------------------------------
  // Chip management
  // ---------------------------------------------------------------------
  function renderChips() {
    symptomChips.innerHTML = symptoms
      .map(
        (symptom, index) => `
        <span class="chip" data-index="${index}">
          ${capitalize(symptom)}
          <button type="button" class="chip__remove" aria-label="Remove ${symptom}" data-index="${index}">&times;</button>
        </span>
      `
      )
      .join("");

    emptyHint.hidden = symptoms.length > 0;
    checkSymptomsBtn.disabled = symptoms.length === 0;
  }

  function addSymptom(rawValue) {
    const value = rawValue.trim().toLowerCase();
    if (!value) return;
    if (symptoms.includes(value)) {
      symptomInput.value = "";
      return;
    }
    symptoms.push(value);
    symptomInput.value = "";
    symptomInput.focus();
    renderChips();
  }

  function removeSymptom(index) {
    symptoms.splice(index, 1);
    renderChips();
  }

  symptomForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addSymptom(symptomInput.value);
  });

  symptomChips.addEventListener("click", (event) => {
    const button = event.target.closest(".chip__remove");
    if (!button) return;
    removeSymptom(Number(button.dataset.index));
  });

  // ---------------------------------------------------------------------
  // Symptom matching
  // ---------------------------------------------------------------------
  function findMatches(symptomList) {
    // matches: { symptom, medications: [{name, dose}] }
    const matches = [];
    const unmatched = [];

    symptomList.forEach((symptom) => {
      const matchingMeds = currentMedications.filter((med) =>
        med.sideEffects.some(
          (effect) => effect.includes(symptom) || symptom.includes(effect)
        )
      );

      if (matchingMeds.length > 0) {
        matches.push({
          symptom,
          medications: matchingMeds.map((med) => ({ name: med.name, dose: med.dose })),
        });
      } else {
        unmatched.push(symptom);
      }
    });

    return { matches, unmatched };
  }

  function renderResults() {
    const { matches, unmatched } = findMatches(symptoms);
    const groups = [];

    // Group matches by medication for a cleaner summary
    if (matches.length > 0) {
      const byMedication = new Map();

      matches.forEach(({ symptom, medications }) => {
        medications.forEach((med) => {
          const key = `${med.name} — ${med.dose}`;
          if (!byMedication.has(key)) {
            byMedication.set(key, new Set());
          }
          byMedication.get(key).add(symptom);
        });
      });

      byMedication.forEach((symptomSet, medKey) => {
        const severity = symptomSet.size > 1 ? "danger" : "warning";
        groups.push(`
          <div class="result-group result-group--${severity}">
            <div class="result-group__header">
              <span class="result-group__icon">${severity === "danger" ? "⚠️" : "⚡"}</span>
              <h3 class="result-group__title result-group__title--${severity}">
                Possibly related to ${medKey}
              </h3>
            </div>
            <p class="result-group__text">
              The symptom${symptomSet.size > 1 ? "s" : ""} below ${symptomSet.size > 1 ? "are" : "is"} a
              known side effect of this medication. Consider whether the timing matches your dose.
            </p>
            <div class="result-group__symptoms">
              ${Array.from(symptomSet)
                .map((symptom) => `<span class="tag">${capitalize(symptom)}</span>`)
                .join("")}
            </div>
          </div>
        `);
      });
    }

    // Symptoms that don't match any known side effect
    if (unmatched.length > 0) {
      groups.push(`
        <div class="result-group result-group--new">
          <div class="result-group__header">
            <span class="result-group__icon">✨</span>
            <h3 class="result-group__title result-group__title--new">Could be something new</h3>
          </div>
          <p class="result-group__text">
            The symptom${unmatched.length > 1 ? "s" : ""} below ${unmatched.length > 1 ? "don't" : "doesn't"}
            match any known side effect of your current medications. It may be unrelated to your treatment.
          </p>
          <div class="result-group__symptoms">
            ${unmatched.map((symptom) => `<span class="tag">${capitalize(symptom)}</span>`).join("")}
          </div>
        </div>
      `);
    }

    // Always recommend a doctor checkup — more urgent wording if there
    // are unmatched symptoms or multiple medication matches.
    const recommendUrgent = unmatched.length > 0 || matches.length >= 2;

    groups.push(`
      <div class="doctor-banner">
        <span class="doctor-banner__icon">👨‍⚕️</span>
        <div class="doctor-banner__body">
          <p class="doctor-banner__title">
            ${recommendUrgent ? "We recommend scheduling a doctor checkup" : "Consider mentioning this to your doctor"}
          </p>
          <p class="doctor-banner__text">
            ${
              recommendUrgent
                ? "Some of your symptoms aren't fully explained by your current medications, or may involve multiple drugs. Please consult a healthcare professional for an accurate diagnosis."
                : "This looks like a known side effect, but only a healthcare professional can confirm it and advise on next steps."
            }
          </p>
        </div>
        <a href="#" class="btn btn--primary">Find a Doctor</a>
      </div>
    `);

    results.innerHTML = groups.join("");
    results.hidden = false;
    resultsPlaceholder.hidden = true;
  }

  checkSymptomsBtn.addEventListener("click", () => {
    if (symptoms.length === 0) return;
    renderResults();
  });

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------
  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  renderMedReference();
  renderChips();
});
