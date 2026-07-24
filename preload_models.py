# preload_models.py
import easyocr

# This downloads and caches the detection and recognition models into ~/.EasyOCR/
print("Downloading EasyOCR model weights...")
easyocr.Reader(['en'], download_enabled=True)
print("Models cached successfully!")
