import re
import difflib

# ---------------------------------------------------------------------------
# Reference data used only to gently CORRECT obvious OCR misreads of common
# medicines/ingredients (e.g. "Doi0-650" -> "Dolo-650", "Paracetamoi" ->
# "Paracetamol"). This never invents a name - a candidate is only replaced
# if it's a close match, so unfamiliar/uncommon medicines are left exactly
# as OCR read them.
# ---------------------------------------------------------------------------
KNOWN_MEDICINE_NAMES = [
    "Dolo-650", "Dolo-500", "Dolo-1000", "Crocin", "Crocin Advance",
    "Combiflam", "Calpol", "Metacin", "Sumo", "Zerodol", "Zerodol-SP",
    "Meftal", "Meftal Spas", "Volini", "Moov", "Digene", "Eno", "Gelusil",
    "Pan-40", "Pan-D", "Pantop", "Pantop-D", "Rantac", "Omez", "Ondem",
    "Azithral", "Azithral-500", "Augmentin", "Augmentin-625", "Amoxyclav",
    "Ciplox", "Norflox", "Cifran", "Taxim-O", "Cefixime", "Levoflox",
    "Doxy-1", "Doxt-SL", "Flagyl", "Metrogyl", "Cetrizine", "Cetzine",
    "Allegra", "Avil", "Montair", "Montair-LC", "Asthalin", "Foracort",
    "Budecort", "Wikoryl", "Sinarest", "D-Cold", "Vicks Action 500",
    "Amlong", "Amlopres", "Telma", "Telma-40", "Losar", "Losar-H",
    "Atorva", "Rosuvas", "Ecosprin", "Ecosprin-75", "Clopilet",
    "Glycomet", "Glycomet-GP", "Januvia", "Galvus",
    "Shelcal", "Shelcal-500", "Becosules", "Zincovit", "Neurobion Forte",
    "Revital", "Supradyn", "Limcee", "Evion-400", "Restyl", "Alprax",
]

KNOWN_GENERIC_INGREDIENTS = [
    "Paracetamol", "Ibuprofen", "Amoxicillin", "Azithromycin", "Metformin",
    "Atorvastatin", "Losartan", "Amlodipine", "Omeprazole", "Pantoprazole",
    "Rabeprazole", "Rosuvastatin", "Telmisartan", "Cetirizine",
    "Levocetirizine", "Montelukast", "Domperidone", "Ondansetron",
    "Diclofenac", "Naproxen", "Aspirin", "Clopidogrel", "Metronidazole",
    "Doxycycline", "Cefixime", "Levofloxacin", "Ciprofloxacin",
    "Amoxicillin & Potassium Clavulanate", "Dextromethorphan",
    "Ranitidine", "Chlorpheniramine Maleate", "Phenylephrine",
    "Ambroxol", "Bromhexine", "Vitamin C", "Multivitamin",
]

# Pharmaceutical form / dosage-form keywords, used to locate the
# "<generic drug> <form> <IP/BP/USP>" line on the packaging.
FORM_KEYWORDS = [
    "tablets", "tablet", "tabs", "tab", "capsules", "capsule", "caps",
    "syrup", "suspension", "injection", "drops", "ointment", "cream",
    "gel", "lotion", "powder", "sachets", "sachet",
]

STANDARD_SUFFIXES = ["ip", "bp", "usp", "jp"]

# Substrings that flag a line as packaging boilerplate rather than the
# actual brand/product name, so it's never mistakenly picked as the
# medicine name.
NOISE_KEYWORDS = [
    "batch", "b.no", "b no", "lot no", "lot", "exp", "expiry", "mfg",
    "mfd", "manufactured", "marketed", "mrp", "rs.", "price", "storage",
    "store below", "store in", "keep out of reach", "read the label",
    "read the accompanying", "each tablet contains", "each capsule contains",
    "each film", "composition", "www.", ".com", "helpline", "regd",
    "lic no", "license no", "for external use", "schedule h",
    "schedule g", "rx only", "consult", "physician", "caution",
    "warning", "not for", "protect from light", "protect from moisture",
    "net wt", "net weight", "pack of", "strip of", "dosage:", "direction",
    "customer care", "toll free", "distributed by",
]

DOSAGE_UNIT_PATTERN = r'(?:mg|mcg|µg|ug|g|ml|iu|%)'

# Only used against text that already contains digits, to fix common
# OCR letter/digit confusions (O<->0, l/I<->1) WITHOUT touching normal
# words elsewhere in the line.
_NUM_OCR_FIXES = [
    (re.compile(r'(?<=\d)[oO](?=\d)'), '0'),
    (re.compile(r'(?<=\d)[oO](?=\s*(?:mg|mcg|g|ml|iu|%))', re.IGNORECASE), '0'),
    (re.compile(r'(?<=\d)[lI](?=\d)'), '1'),
]


def _fix_number_ocr_errors(text: str) -> str:
    for pattern, replacement in _NUM_OCR_FIXES:
        text = pattern.sub(replacement, text)
    return text


def _looks_like_noise(line: str) -> bool:
    lowered = line.lower()
    if any(keyword in lowered for keyword in NOISE_KEYWORDS):
        return True

    # Lines that are almost entirely digits/punctuation (batch codes,
    # phone numbers, dates) are never a brand name.
    letters = sum(c.isalpha() for c in line)
    if letters < 2:
        return True

    return False


def _best_fuzzy_match(candidate: str, choices: list, cutoff: float = 0.72, max_len_diff: int = 3) -> str:
    """
    Returns a corrected known spelling if `candidate` is a close match,
    otherwise returns the candidate unchanged.

    A length-similarity guard is applied on top of the ratio cutoff:
    without it, a longer, legitimate product name (e.g. "Augmentin 625
    Duo") can end up fuzzy-matched down to a shorter, unrelated dictionary
    entry ("Augmentin-625") purely because most of its characters
    overlap - silently dropping real information. Restricting matches to
    a similar length means corrections only fire for genuine
    same-length OCR typos (e.g. "Doi0-650" -> "Dolo-650"), not wholesale
    replacement with a shorter known name.
    """
    if not candidate:
        return candidate

    matches = difflib.get_close_matches(candidate, choices, n=3, cutoff=cutoff)
    for match in matches:
        if abs(len(match) - len(candidate)) <= max_len_diff:
            return match

    return candidate


def _normalise_dosage(raw: str) -> str:
    raw = re.sub(r'\s+', '', raw)
    raw = raw.replace("µg", "mcg").replace("ug", "mcg")
    match = re.match(rf'^(\d+(?:\.\d+)?)({DOSAGE_UNIT_PATTERN})$', raw, re.IGNORECASE)
    if match:
        return f"{match.group(1)} {match.group(2).lower()}"
    return raw


def _extract_dosage(lines: list) -> str:
    """
    Finds the medicine's dosage strength, e.g. "650 mg", "500mg",
    "125mg/5ml", "12.5mcg".

    The previous version grabbed the FIRST number+unit found anywhere in
    the OCR text, which frequently matched a batch number, MRP, or an
    unrelated figure instead of the actual strength. This scans line by
    line, skips anything that looks like packaging boilerplate
    (batch/expiry/price/etc.) first, and also corrects common OCR digit
    confusions (e.g. "65Omg" -> "650mg") before matching.
    """
    dosage_regex = re.compile(
        rf'(\d+(?:\.\d+)?\s?{DOSAGE_UNIT_PATTERN}(?:\s?/\s?\d+(?:\.\d+)?\s?{DOSAGE_UNIT_PATTERN})?)',
        re.IGNORECASE
    )

    candidates = [line for line in lines if not _looks_like_noise(line)]
    candidates += [line for line in lines if _looks_like_noise(line)]

    for line in candidates:
        fixed = _fix_number_ocr_errors(line)
        match = dosage_regex.search(fixed)
        if match:
            return _normalise_dosage(match.group(1))

    return ""


def _extract_generic_name(lines: list):
    """
    Finds the "<drug ingredient(s)> <form> <IP/BP/USP/JP>" line, e.g.
    "Paracetamol Tablets IP" or "Amoxicillin & Potassium Clavulanate
    Tablets IP".

    Matching is done LINE BY LINE (not on the whole OCR text glued
    together) so the brand name printed on a separate line can never leak
    into the captured ingredient text. A stricter pass that requires the
    IP/BP/USP/JP suffix runs first, since that suffix reliably marks the
    true pharmacopoeia/generic-name line even when a brand name earlier in
    the label also happens to contain a form word (e.g. "Crocin Cough
    Syrup"); a looser pass without the suffix is used as a fallback for
    packaging that omits it.
    """
    form_group = "|".join(FORM_KEYWORDS)
    suffix_group = "|".join(STANDARD_SUFFIXES)
    ingredient_chars = r'[A-Za-z&,\s]'

    strict_pattern = re.compile(
        rf'([A-Za-z]{ingredient_chars}{{1,60}}?)\s+({form_group})\b\s+({suffix_group})\b',
        re.IGNORECASE
    )
    loose_pattern = re.compile(
        rf'([A-Za-z]{ingredient_chars}{{1,60}}?)\s+({form_group})\b',
        re.IGNORECASE
    )

    def build_result(match):
        ingredient = match.group(1).strip(" ,")
        ingredient = _best_fuzzy_match(ingredient, KNOWN_GENERIC_INGREDIENTS, cutoff=0.75)
        form = match.group(2)
        suffix = match.group(3) if match.lastindex and match.lastindex >= 3 else None

        parts = [ingredient.title() if not ingredient.isupper() else ingredient, form.title()]
        if suffix:
            parts.append(suffix.upper())
        return " ".join(parts)

    for line in lines:
        match = strict_pattern.search(line)
        if match:
            return build_result(match), line

    for line in lines:
        match = loose_pattern.search(line)
        if match:
            return build_result(match), line

    return "", None


def _extract_medicine_name(lines: list, generic_source_line):
    """
    Finds the brand/product name printed on the packaging.

    Strategy:
      1. Prefer the classic "Brand-Dosage" pattern (e.g. "Dolo-650"),
         common on Indian OTC packaging.
      2. Otherwise, fall back to the first OCR line that isn't
         boilerplate and isn't the exact line already used for the
         generic name - on real packaging the brand name is almost
         always the first prominent line of text.
      3. Run the result through a conservative fuzzy-match against a
         short list of well-known medicine names, to correct obvious
         OCR letter/number confusion (only when the match is close).
    """
    full_text = " ".join(lines)
    brand_match = re.search(r'\b([A-Z][A-Za-z]+-\d{2,4})\b', full_text)
    if brand_match:
        return _best_fuzzy_match(brand_match.group(1), KNOWN_MEDICINE_NAMES)

    for line in lines:
        if line == generic_source_line:
            continue
        if _looks_like_noise(line):
            continue
        if re.fullmatch(rf'\s*\d+(?:\.\d+)?\s?{DOSAGE_UNIT_PATTERN}\s*', line, re.IGNORECASE):
            continue

        return _best_fuzzy_match(line.strip(), KNOWN_MEDICINE_NAMES)

    return ""


def extract_medicine_details(ocr_text):
    """
    Parses the raw OCR lines from a medicine label into structured fields.

    `ocr_text` is a list of text lines (already ordered top-to-bottom by
    ocr.py). Returns medicine_name, generic_name, and dosage - the same
    contract the rest of the app expects.
    """
    lines = [line.strip() for line in ocr_text if line and line.strip()]

    generic_name, generic_source_line = _extract_generic_name(lines)
    dosage = _extract_dosage(lines)
    medicine_name = _extract_medicine_name(lines, generic_source_line)

    # If the dosage couldn't be found anywhere but the brand name itself
    # encodes it (e.g. "Dolo-650"), fall back to that number rather than
    # leaving dosage blank. No unit is assumed since we can't be sure it's
    # mg vs mcg vs ml - the verify step lets the user fill that in.
    if not dosage:
        trailing_number = re.search(r'-(\d{2,4})$', medicine_name)
        if trailing_number:
            dosage = trailing_number.group(1)

    # Fallback: if no brand name was found at all, use the generic name
    # so the field isn't left completely empty.
    if not medicine_name:
        medicine_name = generic_name

    return {
        "medicine_name": medicine_name,
        "generic_name": generic_name,
        "dosage": dosage,
    }
