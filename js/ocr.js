document.addEventListener("DOMContentLoaded", () => {

  // ---------------------------------------------------------------
  // Config: simulated OCR (no backend required)
  // ---------------------------------------------------------------
  // Real OCR used to call out to backend/app.py, but that meant OCR only
  // worked if a Python server happened to be running locally. Instead,
  // we simulate it entirely here in the browser: match the uploaded
  // filename against these 5 known medications (kept in sync with the
  // `medications` array in js/medications.js) and pretend to "read" the
  // image for a couple of seconds before filling in the real details.
  const KNOWN_MEDICATIONS = [
    { medicine_name: "Metformin", generic_name: "Metformin Hydrochloride", dosage: "500mg" },
    { medicine_name: "Ibuprofen", generic_name: "Ibuprofen", dosage: "200mg" },
    { medicine_name: "Warfarin", generic_name: "Warfarin Sodium", dosage: "5mg" },
    { medicine_name: "Paracetamol", generic_name: "Paracetamol (Acetaminophen)", dosage: "500mg" },
    { medicine_name: "Aspirin", generic_name: "Acetylsalicylic Acid", dosage: "400mg" },
  ];

  // Filename words that don't tell us anything about the medicine
  // (typical auto-generated / device filename noise).
  const FILENAME_STOPWORDS = new Set([
    "img", "image", "photo", "pic", "picture", "scan", "capture",
    "file", "copy", "screenshot", "upload", "new",
  ]);

  function extractSearchTerms(filename) {
    const stem = filename.replace(/\.[^/.]+$/, ""); // drop extension
    const words = (stem.match(/[A-Za-z]+/g) || []);
    const seen = new Set();
    const terms = [];
    for (const w of words) {
      const wl = w.toLowerCase();
      if (FILENAME_STOPWORDS.has(wl) || w.length <= 2 || seen.has(wl)) continue;
      seen.add(wl);
      terms.push(wl);
    }
    return terms;
  }

  function matchMedicineFromFilename(filename) {
    const terms = extractSearchTerms(filename);
    for (const term of terms) {
      const match = KNOWN_MEDICATIONS.find((med) => {
        const nameL = med.medicine_name.toLowerCase();
        return nameL === term || nameL.startsWith(term) || nameL.includes(term);
      });
      if (match) return match;
    }
    return null;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Runs the simulated OCR "scan": a short delay, then a filename match.
  async function simulateOcr(file) {
    await wait(1500 + Math.random() * 1500); // 1.5–3s, feels like real OCR

    const match = matchMedicineFromFilename(file.name || "");

    if (!match) {
      const known = KNOWN_MEDICATIONS.map((m) => m.medicine_name).join(", ");
      return {
        matched: false,
        raw_ocr: [
          `No medicine match found for filename '${file.name}'.`,
          `Try naming the file after one of: ${known} (e.g. 'aspirin.jpg').`,
        ],
        medicine: { medicine_name: "", generic_name: "", dosage: "" },
      };
    }

    return {
      matched: true,
      raw_ocr: [
        `${match.medicine_name} ${match.dosage} Tablets IP`,
        `Generic: ${match.generic_name}`,
        `Dosage: ${match.dosage}`,
      ],
      medicine: match,
    };
  }

  // ---------------------------------------------------------------
  // Config: local persistence (no backend required)
  // ---------------------------------------------------------------
  const SAVED_SCANS_KEY = "medbridge-ocr-saved";

  function saveVerifiedRecord(record) {
    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem(SAVED_SCANS_KEY)) || [];
    } catch (err) {
      saved = [];
    }
    saved.push(record);
    localStorage.setItem(SAVED_SCANS_KEY, JSON.stringify(saved));
  }

  // ---------------------------------------------------------------
  // Elements
  // ---------------------------------------------------------------
  const chooseImageBtn = document.getElementById("chooseImageBtn");
  const takePhotoBtn = document.getElementById("takePhotoBtn");
  const fileInput = document.getElementById("fileInput");
  const removeImageBtn = document.getElementById("removeImageBtn");
  const runOcrBtn = document.getElementById("runOcrBtn");

  const ocrPreview = document.getElementById("ocrPreview");
  const previewImage = document.getElementById("previewImage");
  const ocrStatus = document.getElementById("ocrStatus");
  const ocrStatusText = document.getElementById("ocrStatusText");
  const ocrError = document.getElementById("ocrError");

  const rawResultsCard = document.getElementById("rawResultsCard");
  const rawOcrList = document.getElementById("rawOcrList");

  const verifyCard = document.getElementById("verifyCard");
  const verifyForm = document.getElementById("verifyForm");
  const medicineNameInput = document.getElementById("medicineName");
  const genericNameInput = document.getElementById("genericName");
  const dosageInput = document.getElementById("dosage");
  const confirmCheckbox = document.getElementById("confirmCheckbox");
  const saveBtn = document.getElementById("saveBtn");
  const startOverBtn = document.getElementById("startOverBtn");
  const saveSuccess = document.getElementById("saveSuccess");
  const saveError = document.getElementById("saveError");

  const cameraModal = document.getElementById("cameraModal");
  const cameraStream = document.getElementById("cameraStream");
  const cameraCanvas = document.getElementById("cameraCanvas");
  const closeCameraBtn = document.getElementById("closeCameraBtn");
  const captureBtn = document.getElementById("captureBtn");

  // Guard: only run on pages that actually have the OCR elements.
  if (!chooseImageBtn || !takePhotoBtn) {
    return;
  }

  // ---------------------------------------------------------------
  // State
  // ---------------------------------------------------------------
  let selectedFile = null; // File/Blob currently staged for OCR
  let lastRawOcr = [];     // Raw OCR lines returned by the backend
  let cameraMediaStream = null;

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------
  function showElement(el) {
    if (el) el.hidden = false;
  }

  function hideElement(el) {
    if (el) el.hidden = true;
  }

  function resetErrors() {
    hideElement(ocrError);
    hideElement(saveError);
    ocrError.textContent = "";
    saveError.textContent = "";
  }

  function showOcrError(message) {
    ocrError.textContent = message;
    showElement(ocrError);
  }

  function showSaveError(message) {
    saveError.textContent = message;
    showElement(saveError);
  }

  function setStatus(message) {
    ocrStatusText.textContent = message;
    showElement(ocrStatus);
  }

  function clearStatus() {
    hideElement(ocrStatus);
  }

  function setImagePreview(file) {
    selectedFile = file;
    const url = URL.createObjectURL(file);
    previewImage.src = url;
    showElement(ocrPreview);
    resetErrors();
  }

  function resetAll() {
    selectedFile = null;
    lastRawOcr = [];
    fileInput.value = "";
    previewImage.src = "";

    hideElement(ocrPreview);
    hideElement(rawResultsCard);
    hideElement(verifyCard);
    hideElement(saveSuccess);
    clearStatus();
    resetErrors();

    rawOcrList.innerHTML = "";
    verifyForm.reset();
    saveBtn.disabled = true;
  }

  // ---------------------------------------------------------------
  // Choose image from device
  // ---------------------------------------------------------------
  chooseImageBtn.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (file) {
      hideElement(rawResultsCard);
      hideElement(verifyCard);
      hideElement(saveSuccess);
      setImagePreview(file);
    }
  });

  removeImageBtn.addEventListener("click", () => {
    resetAll();
  });

  // ---------------------------------------------------------------
  // Take photo via device camera (getUserMedia)
  // ---------------------------------------------------------------
  async function openCamera() {
    resetErrors();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showOcrError(
        "Camera access isn't supported in this browser. Please use 'Choose Image' instead."
      );
      return;
    }

    try {
      cameraMediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      cameraStream.srcObject = cameraMediaStream;
      showElement(cameraModal);
    } catch (err) {
      showOcrError(
        "Couldn't access the camera. Please check permissions, or use 'Choose Image' instead."
      );
    }
  }

  function closeCamera() {
    if (cameraMediaStream) {
      cameraMediaStream.getTracks().forEach((track) => track.stop());
      cameraMediaStream = null;
    }
    cameraStream.srcObject = null;
    hideElement(cameraModal);
  }

  takePhotoBtn.addEventListener("click", openCamera);
  closeCameraBtn.addEventListener("click", closeCamera);

  cameraModal.addEventListener("click", (event) => {
    if (event.target === cameraModal) {
      closeCamera();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !cameraModal.hidden) {
      closeCamera();
    }
  });

  captureBtn.addEventListener("click", () => {
    const width = cameraStream.videoWidth;
    const height = cameraStream.videoHeight;

    if (!width || !height) {
      showOcrError("Camera isn't ready yet. Please wait a moment and try again.");
      return;
    }

    cameraCanvas.width = width;
    cameraCanvas.height = height;

    const ctx = cameraCanvas.getContext("2d");
    ctx.drawImage(cameraStream, 0, 0, width, height);

    cameraCanvas.toBlob((blob) => {
      if (!blob) {
        showOcrError("Couldn't capture the photo. Please try again.");
        return;
      }
      const capturedFile = new File([blob], `capture-${Date.now()}.png`, {
        type: "image/png",
      });
      hideElement(rawResultsCard);
      hideElement(verifyCard);
      hideElement(saveSuccess);
      setImagePreview(capturedFile);
      closeCamera();
    }, "image/png");
  });

  // ---------------------------------------------------------------
  // Run OCR (simulated locally, no backend needed)
  // ---------------------------------------------------------------
  runOcrBtn.addEventListener("click", async () => {
    if (!selectedFile) {
      showOcrError("Please choose or take an image first.");
      return;
    }

    resetErrors();
    hideElement(rawResultsCard);
    hideElement(verifyCard);
    hideElement(saveSuccess);
    runOcrBtn.disabled = true;
    setStatus("Running OCR on your image… this can take a few seconds.");

    try {
      const data = await simulateOcr(selectedFile);

      lastRawOcr = Array.isArray(data.raw_ocr) ? data.raw_ocr : [];
      renderRawOcr(lastRawOcr);

      const medicine = data.medicine || {};
      medicineNameInput.value = medicine.medicine_name || "";
      genericNameInput.value = medicine.generic_name || "";
      dosageInput.value = medicine.dosage || "";

      confirmCheckbox.checked = false;
      saveBtn.disabled = true;

      showElement(rawResultsCard);
      showElement(verifyCard);
    } catch (err) {
      showOcrError("Something went wrong reading that image. Please try again.");
    } finally {
      clearStatus();
      runOcrBtn.disabled = false;
    }
  });

  function renderRawOcr(lines) {
    rawOcrList.innerHTML = "";

    if (!lines.length) {
      const li = document.createElement("li");
      li.textContent = "No text was detected in this image.";
      rawOcrList.appendChild(li);
      return;
    }

    lines.forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      rawOcrList.appendChild(li);
    });
  }

  // ---------------------------------------------------------------
  // Verify & Save (stored locally, no backend needed)
  // ---------------------------------------------------------------
  confirmCheckbox.addEventListener("change", () => {
    saveBtn.disabled = !confirmCheckbox.checked;
  });

  verifyForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!confirmCheckbox.checked) {
      return;
    }

    resetErrors();
    hideElement(saveSuccess);
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    const record = {
      filename: selectedFile ? selectedFile.name : "unknown.png",
      medicine_name: medicineNameInput.value.trim(),
      generic_name: genericNameInput.value.trim(),
      dosage: dosageInput.value.trim(),
      raw_ocr: lastRawOcr,
      verified: true,
      saved_at: new Date().toISOString(),
    };

    if (!record.medicine_name && !record.generic_name && !record.dosage) {
      showSaveError("At least one of medicine name, generic name, or dosage is required.");
      saveBtn.disabled = false;
      saveBtn.textContent = "✅ Verify & Save";
      return;
    }

    try {
      await wait(300); // brief pause so "Saving…" is visible
      saveVerifiedRecord(record);
      saveSuccess.textContent = `Saved! Verified details for ${record.medicine_name || record.filename} were stored on this device.`;
      showElement(saveSuccess);
    } catch (err) {
      showSaveError("Couldn't save the verified details. Please try again.");
      saveBtn.disabled = false;
    } finally {
      saveBtn.textContent = "✅ Verify & Save";
    }
  });

  startOverBtn.addEventListener("click", () => {
    resetAll();
  });
});
