import cv2

def preprocess_image(image_path):

    image = cv2.imread(image_path)

    # Resize 2x
    image = cv2.resize(
        image,
        None,
        fx=2,
        fy=2,
        interpolation=cv2.INTER_CUBIC
    )

    # Gray
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Noise removal
    gray = cv2.medianBlur(gray, 3)

    # Sharpen
    kernel = [
        [-1,-1,-1],
        [-1,9,-1],
        [-1,-1,-1]
    ]

    import numpy as np

    kernel = np.array(kernel)

    sharp = cv2.filter2D(gray,-1,kernel)

    # Threshold

    thresh = cv2.threshold(
        sharp,
        0,
        255,
        cv2.THRESH_BINARY+cv2.THRESH_OTSU
    )[1]

    return thresh