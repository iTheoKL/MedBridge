from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os
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
