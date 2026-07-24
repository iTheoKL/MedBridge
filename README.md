# MedBridge

MedBridge is an intelligent medication management platform designed to improve patient safety, streamline adherence, and promote better healthcare outcomes. It is built specifically for elderly patients, individuals managing complex chronic conditions, and caregivers juggling multiple prescriptions.

## Key Features

* **Unified Medication Profile:** Consolidates prescriptions from different healthcare providers into a single, accurate view.
* **Proactive Risk Detection:** Automatically analyzes patient profiles to identify harmful drug interactions, duplicate medications, and timing conflicts.
* **Symptom & Side Effect Tracking:** Records patient symptoms to correlate them with current medications and known side effects.
* **Smart Reminders:** Supports strict medication adherence with timely, automated alerts.
* **Care Continuity:** Generates organized, shareable medication summaries to optimize communication during doctor consultations.

## Progress So Far

The project started as a static frontend concept and has since grown a working OCR intake pipeline and an early medication-interaction engine.

### Frontend / Dashboard UI — Theo ([@iTheoKL](https://github.com/iTheoKL)), on behalf of Dhayalan
- Initial `index.html` and overall MedBridge dashboard structure
- `css/style.css` — styling, with a follow-up syntax fix
- `js/script.js` — user dropdown menu toggle, alert dismissal, and active-navigation-item highlighting

### OCR Intake API — vajahath ([@vajahath-ms](https://github.com/vajahath-ms))
- `backend/app.py`, `backend/ocr.py`, `backend/parser.py`, `backend/preprocess.py`
- Implemented the MedBridge OCR API with image upload support, so prescription images can be read and parsed into structured data

### Medication Interaction Logic — jeevan ([@jeevan-hit](https://github.com/jeevan-hit))
- `hittu/app.py`, `hittu/interaction_db.csv`
- Added a script to print medication details/interactions plus a starter interaction database for detecting drug-interaction conflicts

### Commit Log (chronological)
1. **Theo** — Initial commit
2. **Theo** — Expand README with key features of MedBridge
3. **vajahath** — Implement MedBridge OCR API with image upload
4. **vajahath** — Add files via upload (×3, supporting OCR backend files)
5. **Theo** (for Dhayalan) — Create index.html
6. **Theo** (for Dhayalan) — Add MedBridge Dashboard HTML structure
7. **Theo** (for Dhayalan) — Create style.css
8. **Theo** — Update style.css
9. **Theo** (for Dhayalan) — Fix CSS syntax
10. **Theo** (for Dhayalan) — Create script.js
11. **Theo** (for Dhayalan) — Implement user menu and navigation enhancements
12. **Theo** (for Dhayalan) — Remove comment for user dropdown menu toggle
13. **jeevan** — Implement medication details and interaction script
14. **jeevan** — Add interaction database for drug interactions

*(This section reflects commit history as of July 24, 2026.)*
