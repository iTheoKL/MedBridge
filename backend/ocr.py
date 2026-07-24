import easyocr
from preprocess import preprocess_image

reader = easyocr.Reader(['en'])

def extract_text(image_path):

    processed = preprocess_image(image_path)

    result = reader.readtext(
        processed,
        paragraph=True
    )

    extracted = []

    for item in result:
        extracted.append(item[1])

    print("\nOCR OUTPUT")
    print(extracted)

    return extracted