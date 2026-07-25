import easyocr
from preprocess import preprocess_image

reader = easyocr.Reader(['en'], gpu=False)

# Detections below this confidence are almost always noise (scratches,
# packaging texture, barcode artifacts) rather than real characters.
MIN_CONFIDENCE = 0.35

# Text lines are grouped into the same "row" if their top-left Y
# coordinates fall within this many pixels of each other, so results
# read top-to-bottom, left-to-right the way a person reads the label.
ROW_GROUPING_PX = 15


def _run_reader(image):
    """
    Runs EasyOCR on a single preprocessed image variant.

    paragraph=False (unlike the previous version) is used deliberately:
    paragraph mode merges nearby text blocks together, which sounds
    convenient but actually hurts accuracy here - it was gluing the
    brand name, dosage, and unrelated printed warnings into one long
    string, making it far harder (and less reliable) for the parser to
    pull out the medicine name/dosage correctly. Reading each detected
    text box separately, with its own confidence score and position,
    gives the parser much cleaner, more precise input to work with.
    """
    results = reader.readtext(image, paragraph=False, detail=1)

    detections = []
    for bbox, text, confidence in results:
        text = text.strip()
        if not text or confidence < MIN_CONFIDENCE:
            continue

        xs = [point[0] for point in bbox]
        ys = [point[1] for point in bbox]

        detections.append({
            "text": text,
            "confidence": confidence,
            "x": min(xs),
            "y": min(ys),
        })

    return detections


def extract_text(image_path):
    """
    Runs OCR across multiple preprocessed variants of the same image and
    merges the results, keeping whichever version detected each piece of
    text with higher confidence. Running more than one variant matters
    because a single preprocessing choice (e.g. hard binarization) reads
    some labels well and others badly - merging keeps the best of both.
    """
    variants = preprocess_image(image_path)

    all_detections = []
    for variant_image in variants.values():
        all_detections.extend(_run_reader(variant_image))

    # De-duplicate text picked up by more than one variant, keeping the
    # higher-confidence reading of the two.
    best_by_text = {}
    for det in all_detections:
        key = det["text"].lower()
        if key not in best_by_text or det["confidence"] > best_by_text[key]["confidence"]:
            best_by_text[key] = det

    # Sort into natural reading order: top-to-bottom (rounded into rows so
    # slightly tilted text on the same line still groups together), then
    # left-to-right within each row.
    ordered = sorted(
        best_by_text.values(),
        key=lambda d: (round(d["y"] / ROW_GROUPING_PX), d["x"])
    )

    extracted = [d["text"] for d in ordered]

    print("\nOCR OUTPUT")
    print(extracted)

    return extracted
