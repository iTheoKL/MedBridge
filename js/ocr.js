document.addEventListener("DOMContentLoaded", () => {

  // ---------------------------------------------------------------
  // Config
  // ---------------------------------------------------------------
  // Base URL of the MedBridge FastAPI backend (backend/app.py).
  // Update this if the backend is hosted somewhere other than localhost.
  const API_BASE = "http://127.0.0.1:8000";

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
  // Run OCR (backend/app.py -> POST /upload)
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

    const formData = new FormData();
    formData.append("file", selectedFile, selectedFile.name || "upload.png");

    try {
      const response = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();

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
      showOcrError(
        "Couldn't reach the OCR backend. Make sure the MedBridge API server (backend/app.py) is running, then try again."
      );
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
  // Verify & Save (backend/app.py -> POST /save)
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

    const payload = {
      filename: selectedFile ? selectedFile.name : "unknown.png",
      medicine_name: medicineNameInput.value.trim(),
      generic_name: genericNameInput.value.trim(),
      dosage: dosageInput.value.trim(),
      raw_ocr: lastRawOcr,
      verified: true,
    };

    try {
      const response = await fetch(`${API_BASE}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();
      saveSuccess.textContent = `Saved! Verified details were written to data/${data.saved_as}`;
      showElement(saveSuccess);
    } catch (err) {
      showSaveError(
        "Couldn't save the verified details. Make sure the MedBridge API server (backend/app.py) is running, then try again."
      );
      saveBtn.disabled = false;
    } finally {
      saveBtn.textContent = "✅ Verify & Save";
    }
  });

  startOverBtn.addEventListener("click", () => {
    resetAll();
  });
});
