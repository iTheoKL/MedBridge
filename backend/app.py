from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import List
import os
import re
import json
import shutil

from ocr import extract_text
from parser import extract_medicine_details

app = FastAPI(
    title="MedBridge OCR API",
    description="Extract Medicine Name and Dosage",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# data/ lives at the project root, alongside backend/, css/, js/
DATA_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
os.makedirs(DATA_FOLDER, exist_ok=True)


class VerifiedMedicine(BaseModel):
    filename: str
    medicine_name: str = ""
    generic_name: str = ""
    dosage: str = ""
    raw_ocr: List[str] = []
    verified: bool = True


def _safe_stem(filename: str) -> str:
    """Turn an arbitrary filename into a safe, extension-less stem for use in a saved data filename."""
    stem = os.path.splitext(filename)[0]
    stem = re.sub(r"[^A-Za-z0-9_-]+", "_", stem).strip("_")
    return stem or "scan"


@app.get("/")
def home():
    return {
        "status": "Running",
        "message": "Welcome to MedBridge OCR API"
    }


@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # OCR
    raw_text = extract_text(file_path)

    # Extract medicine details
    medicine = extract_medicine_details(raw_text)

    return {
    "status":"success",
    "filename":file.filename,
    "raw_ocr":raw_text,
    "medicine":medicine
}


@app.post("/save")
async def save_verified_data(payload: VerifiedMedicine):
    """
    Persists a user-verified OCR result to a .data file inside the data/ folder.

    The record is stored as JSON (with a .data extension) so it stays easy to
    parse later, while making it clear these are reviewed/confirmed entries
    rather than raw OCR output.
    """

    if not payload.medicine_name and not payload.generic_name and not payload.dosage:
        raise HTTPException(
            status_code=400,
            detail="At least one of medicine_name, generic_name or dosage is required."
        )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    saved_as = f"{_safe_stem(payload.filename)}_{timestamp}.data"
    save_path = os.path.join(DATA_FOLDER, saved_as)

    record = {
        "filename": payload.filename,
        "medicine_name": payload.medicine_name,
        "generic_name": payload.generic_name,
        "dosage": payload.dosage,
        "raw_ocr": payload.raw_ocr,
        "verified": payload.verified,
        "saved_at": datetime.now().isoformat(),
    }

    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(record, f, indent=2, ensure_ascii=False)

    return {
        "status": "success",
        "saved_as": saved_as
    }
