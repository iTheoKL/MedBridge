# MedBridge

MedBridge is an intelligent medication management platform designed to improve patient safety, streamline adherence, and promote better healthcare outcomes. It is built specifically for elderly patients, individuals managing complex chronic conditions, and caregivers juggling multiple prescriptions.

## Key Features

* **Unified Medication Profile:** Consolidates prescriptions from different healthcare providers into a single, accurate view.
* **Proactive Risk Detection:** Automatically analyzes patient profiles to identify harmful drug interactions, duplicate medications, and timing conflicts.
* **Symptom & Side Effect Tracking:** Records patient symptoms to correlate them with current medications and known side effects.
* **Smart Reminders:** Supports strict medication adherence with timely, automated alerts.
* **Care Continuity:** Generates organized, shareable medication summaries to optimize communication during doctor consultations.

## Progress So Far

The project started as a static frontend concept and has since grown into a working OCR intake pipeline, a medication-interaction engine, a medication list view, and a reminders module.

### Frontend / Dashboard UI — Dhayalan ([@iTheoKL](https://github.com/iTheoKL))
- Initial `index.html` and overall MedBridge dashboard structure
- `css/style.css` — styling, with a follow-up syntax fix
- `js/script.js` — user dropdown menu toggle, alert dismissal, and active-navigation-item highlighting

### OCR Intake — vajahath ([@vajahath-ms](https://github.com/vajahath-ms))
- `backend/app.py`, `backend/ocr.py`, `backend/parser.py`, `backend/preprocess.py` — the MedBridge OCR API with image upload support, so prescription images can be read and parsed into structured data
- `ocr.html`, `js/ocr.js` — a frontend page for uploading a prescription image and reviewing/verifying the OCR results
- Extended `backend/app.py` to save verified OCR results

### Medication List — Barath ([@barathchandp](https://github.com/barathchandp))
- `medications.html` (originally `list-of-med.html`, later renamed) — a page listing the patient's current medications

### Medication Interaction Logic — jeevan ([@jeevan-hit](https://github.com/jeevan-hit))
- `hittu/app.py`, `hittu/interaction_db.csv` — a script to print medication details/interactions plus a starter interaction database for detecting drug-interaction conflicts

### Reminders — dhinakaran ([@dhinakaran-cys](https://github.com/dhinakaran-cys))
- `reminders.html`, `css/reminder.css`, `js/reminder.js` — a medication reminders page with its own styling and interactive logic

### Reports — kugan ([@kugan6879-svg](https://github.com/kugan6879-svg))
- `report.html`, `js/report.js` — a reporting page for generating/reviewing medication summaries

### Commit Log (chronological)
1. **Dhayalan** — Initial commit
2. **Dhayalan** — Expand README with key features of MedBridge
3. **vajahath** — Implement MedBridge OCR API with image upload
4. **vajahath** — Add files via upload (×3, supporting OCR backend files)
5. **Dhayalan** — Create index.html
6. **Dhayalan** — Add MedBridge Dashboard HTML structure
7. **Dhayalan** — Create style.css
8. **Dhayalan** — Update style.css
9. **Dhayalan** — Fix CSS syntax
10. **Dhayalan** — Create script.js
11. **Dhayalan** — Implement user menu and navigation enhancements
12. **Dhayalan** — Remove comment for user dropdown menu toggle
13. **jeevan** — Implement medication details and interaction script
14. **jeevan** — Add interaction database for drug interactions
15. **Dhayalan** — Update README with project progress and contributions
16. **Dhayalan** — Correct contributor names and update commit log
17. **dhinakaran** — Add files via upload (reminders.html)
18. **dhinakaran** — Add files via upload (css/reminder.css)
19. **dhinakaran** — Add files via upload (js/reminder.js)
20. **vajahath** — Implement data saving for verified OCR results
21. **Barath** — Add files via upload (list-of-med.html)
22. **vajahath** — Add files via upload (js/ocr.js)
23. **vajahath** — Add files via upload (ocr.html)
24. **Dhayalan** — Enhance README with project details and contributions
25. **Barath** — Rename list-of-med.html to medications.html
26. **kugan** — Add files via upload (js/report.js)
27. **kugan** — Add files via upload (report.html)

*(This section reflects commit history as of July 24, 2026.)*
