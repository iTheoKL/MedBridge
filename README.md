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

### Symptom Tracking — Dhayalan ([@iTheoKL](https://github.com/iTheoKL))
- `symptoms.html`, `js/symptoms.js` — records patient symptoms and cross-checks them against known side effects of the medications in `js/medications.js`
- **Note:** a later commit ("Add theme and auth scripts to symptoms.html") accidentally duplicated the entire page body after the closing `</html>` tag, leaving duplicate element IDs (`symptomForm`, `checkSymptomsBtn`, `results`, etc.). This has been fixed locally — the corrected `symptoms.html` needs to be committed to the repo.

### Authentication & Theming — Dhayalan ([@iTheoKL](https://github.com/iTheoKL))
- `login.html`, `logout.html`, `account.html`, `js/auth.js`, `js/logout.js`, `js/account.js` — a basic login/logout flow and account management page, gated by a `medbridge-auth` session check
- `js/theme.js` plus new CSS variables — light/dark theme support (`medbridge-theme` preference), added across every page (index, medications, OCR, reminders, report, symptoms)
- `.vercelignore` — excludes the Python backend and local-only files from the frontend's Vercel deployment

### Drug Database — Dhayalan ([@iTheoKL](https://github.com/iTheoKL)) / Barath ([@barathchandp](https://github.com/barathchandp))
- `database/medications.csv` — an extensive India-focused A–Z medicines dataset (renamed/relocated a couple of times before settling here)
- `database/data.json`, `database/users.json`, `database/placeholder.md` — supporting data files for the app

### Deployment — Dhayalan ([@iTheoKL](https://github.com/iTheoKL))
- `requirements.txt` — pinned Python dependencies (`fastapi`, `uvicorn`, `python-multipart`, `easyocr`, `opencv-python-headless`, `numpy`) for hosting the backend
- `preload_models.py` — downloads and caches the EasyOCR model weights ahead of time, so they don't need to be fetched on a cold start

### Commit Log (chronological, grouped)
1–2. **Dhayalan** — Initial commit; expand README with key features
3–6. **vajahath** — Implement MedBridge OCR API with image upload + supporting files
7–12. **Dhayalan** — index.html, style.css, script.js, nav/user-menu enhancements
13–14. **jeevan** — Medication details/interaction script + interaction database
15–16. **Dhayalan** — Update README with progress + correct contributor names
17–19. **dhinakaran** — reminders.html, css/reminder.css, js/reminder.js
20. **vajahath** — Implement data saving for verified OCR results
21. **Barath** — Add list-of-med.html
22–23. **vajahath** — js/ocr.js, ocr.html
24. **Dhayalan** — Enhance README with project details
25. **Barath** — Rename list-of-med.html to medications.html
26–27. **kugan** — js/report.js, report.html
28. **vajahath** — Update sidebar brand link in ocr.html
29. **Dhayalan** — Update README.md
30. **Dhayalan** — Add requirements.txt
31–32. **dhinakaran** — Update reminders.html refs; trim medications.html
33. **Dhayalan** — Add preload_models.py
34–35. **Dhayalan** — Add symptoms.html, js/symptoms.js
36. **Dhayalan** — Update README with symptom tracking and deployment info
37. **Dhayalan** — Create database/placeholder.md
38. **Dhayalan** — Add drug database
39–42. **Barath / Theo** — Rename/relocate medications.csv into database/
43–44. **Dhayalan** — Add files via upload
45. **Dhayalan** — Refactor CSS variables and styles for consistency
46. **Dhayalan** — Add files via upload
47–51. **Dhayalan** — Refactor medications.html, ocr.html, reminders.html, report.html, symptoms.html (styling/layout cleanup)
52. **Dhayalan** — Add files via upload
53. **Dhayalan** — Enhance theme support with new CSS variables
54. **Dhayalan** — Add files via upload
55. **Dhayalan** — Change logout redirect to login.html
56. **Dhayalan** — Update print statement from 'Hello' to 'Goodbye'
57. **Dhayalan** — Update script.js
58. **Dhayalan** — Add .vercelignore
59–67. **Dhayalan** — Roll out theme + auth guard scripts across account, index, logout, medications, OCR (+ camera capture), reminders, report, and symptoms pages
68. **Dhayalan** — Modify symptoms.js (add Paracetamol/Aspirin entries)
69. **Dhayalan** — Update print statement from 'Hello' to 'Goodbye' (symptoms.js)
70. **Dhayalan** — Update medication reminders and interaction details
71. **Dhayalan** — Add current medications section to report
72. **Dhayalan** — Refactor report.js for improved report handling
73. **Dhayalan** — Change toast and theme-toggle positions in CSS
74. **Dhayalan** — Add new medications to the medication list
75. **Dhayalan** — Enhance comments in symptoms.js for clarity
76. **Dhayalan** — Clarify medication list synchronization in report.js

*(This section reflects commit history as of July 25, 2026.)*
