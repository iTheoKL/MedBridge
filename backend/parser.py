import re

def extract_medicine_details(ocr_text):

    medicine_name = ""
    generic_name = ""
    dosage = ""

    full_text = " ".join(ocr_text)

    # ---------------- Generic Name ----------------
    generic_match = re.search(
        r'([A-Za-z ]+?)\s+Tablets\s+IP',
        full_text,
        re.IGNORECASE
    )

    if generic_match:
        generic_name = generic_match.group(1).strip() + " Tablets IP"

    # ---------------- Dosage ----------------
    dosage_match = re.search(
        r'(\d+\s?(mg|MG|g|G|ml|ML|mcg|MCG))',
        full_text
    )

    if dosage_match:
        dosage = dosage_match.group(1)

    # ---------------- Brand Name ----------------
    # Example:
    # Oziset-500
    # Dolo-650
    # Crocin-650

    brand_match = re.search(
        r'([A-Z][a-zA-Z]+-\d{2,4})',
        full_text
    )

    if brand_match:
        medicine_name = brand_match.group(1)

    # ---------------- Fallback ----------------

    if medicine_name == "":
        medicine_name = generic_name

    return {
        "medicine_name": medicine_name,
        "generic_name": generic_name,
        "dosage": dosage
    }
 
