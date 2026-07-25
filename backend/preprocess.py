import cv2
import numpy as np


def preprocess_image(image_path):
    """
    Prepares a medicine label/strip photo for OCR.

    The previous version forced a hard binary threshold (OTSU) on an
    aggressively sharpened image. That works for flat, high-contrast
    scanned documents, but medicine strips/boxes are usually glossy,
    curved, and printed in colour on foil or plastic - a hard binary
    threshold on those throws away a lot of the actual letter shapes and
    is a major reason OCR was misreading tablet names.

    Instead, this returns TWO milder variants and lets ocr.py run OCR on
    both, then merge the results - this is far more robust across
    different packaging types than committing to a single threshold:

      - "enhanced": grayscale + light denoise + local contrast boost
                    (CLAHE). Keeps stroke detail intact - best for
                    glossy / colourful / uneven-lighting labels.
      - "thresholded": adaptive threshold (not global OTSU) on the
                    enhanced image - helps for flat, evenly lit,
                    printed text on plain backgrounds.
    """
    image = cv2.imread(image_path)

    if image is None:
        raise ValueError(f"Could not read image at path: {image_path}")

    # Upscale so small print becomes legible. INTER_LANCZOS4 preserves edges
    # better than INTER_CUBIC, which matters a lot for thin character strokes.
    image = cv2.resize(
        image,
        None,
        fx=2,
        fy=2,
        interpolation=cv2.INTER_LANCZOS4
    )

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Mild denoise. fastNlMeansDenoising removes sensor/compression noise
    # without smearing character edges the way a median blur + sharpen
    # kernel combo tends to.
    denoised = cv2.fastNlMeansDenoising(
        gray,
        h=10,
        templateWindowSize=7,
        searchWindowSize=21
    )

    # CLAHE (local contrast enhancement) makes faint print on shiny foil or
    # pale backgrounds stand out, without blowing out the rest of the image
    # the way a single sharpening kernel does.
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)

    # Adaptive threshold reacts to local lighting instead of picking one
    # global cutoff for the whole image, so it copes much better with
    # shadows/curved packaging than cv2.THRESH_OTSU did.
    thresholded = cv2.adaptiveThreshold(
        enhanced,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=25,
        C=10
    )

    return {
        "enhanced": enhanced,
        "thresholded": thresholded,
    }
