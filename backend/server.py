from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
import shutil
import time
import uuid
import cv2
import numpy as np
import pytesseract
from pdf2image import convert_from_path

# ========= Flask Setup =========
app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
DEBUG_DIR = os.path.join(UPLOAD_DIR, "debug")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(DEBUG_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ========= CONFIG =========
# Toggle: after perspective-warp, also resize to a fixed canvas
USE_FIXED_CANVAS = False
TARGET_SIZE = (2480, 1550)  # (w, h) only used if USE_FIXED_CANVAS=True

# Percentage-based ROIs -> works with any size of warped/normalized card
# Format: (x%, y%, w%, h%) where % is 0..1
ROI_PERCENTS = {
    "name":   (0.34, 0.34, 0.42, 0.05),
    "dob":    (0.53, 0.38, 0.20, 0.09),
    "gender": (0.40, 0.45, 0.14, 0.05),
    "aadhaar":(0.28, 0.83, 0.50, 0.10),
    "address":(0.02, 0.43, 0.55, 0.35),
}
# ↑ Adjust these quickly after you see the warped debug preview.

# Canny/contour thresholds
MIN_CARD_AREA_RATIO = 0.20  # card must cover >= 20% of image area
CANNY_LOW, CANNY_HIGH = 75, 200
GAUSS_BLUR_KSIZE = 5

# ========= Helpers =========

def unique_name(prefix, ext="jpg"):
    return f"{prefix}_{int(time.time())}_{uuid.uuid4().hex[:6]}.{ext}"

def save_debug(img, label):
    fn = unique_name(label, "jpg")
    path = os.path.join(DEBUG_DIR, fn)
    cv2.imwrite(path, img)
    return fn

def order_points(pts):
    # pts: 4x2
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)        # x+y
    rect[0] = pts[np.argmin(s)]  # top-left
    rect[2] = pts[np.argmax(s)]  # bottom-right

    diff = np.diff(pts, axis=1)  # y - x
    rect[1] = pts[np.argmin(diff)]  # top-right
    rect[3] = pts[np.argmax(diff)]  # bottom-left
    return rect

def four_point_transform(image, pts):
    rect = order_points(pts)
    (tl, tr, br, bl) = rect

    # compute width of the new image
    widthA = np.linalg.norm(br - bl)
    widthB = np.linalg.norm(tr - tl)
    maxW = int(max(widthA, widthB))

    # compute height of the new image
    heightA = np.linalg.norm(tr - br)
    heightB = np.linalg.norm(tl - bl)
    maxH = int(max(heightA, heightB))

    dst = np.array([
        [0, 0],
        [maxW - 1, 0],
        [maxW - 1, maxH - 1],
        [0, maxH - 1]], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxW, maxH), flags=cv2.INTER_CUBIC)
    return warped

def detect_and_warp_card(bgr):
    """
    Returns warped_card, debug_assets, info dict
    Falls back to original if card not found (with reason)
    """
    debug_assets = {}
    info = {"card_found": False, "reason": ""}

    orig = bgr.copy()
    debug_assets["original"] = save_debug(orig, "0_original")

    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    # slight blur reduces noise for Canny
    blur = cv2.GaussianBlur(gray, (GAUSS_BLUR_KSIZE, GAUSS_BLUR_KSIZE), 0)

    edges = cv2.Canny(blur, CANNY_LOW, CANNY_HIGH)
    debug_assets["edges"] = save_debug(edges, "1_edges")

    # find contours
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        info["reason"] = "no contours"
        return bgr, debug_assets, info

    # consider largest contours by area
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:7]
    H, W = gray.shape[:2]
    img_area = W * H

    quad = None
    vis = bgr.copy()

    for c in contours:
        area = cv2.contourArea(c)
        if area < MIN_CARD_AREA_RATIO * img_area:
            continue

        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)

        # draw candidate
        cv2.drawContours(vis, [approx], -1, (0, 255, 255), 3)

        if len(approx) == 4:
            quad = approx.reshape(4, 2).astype("float32")
            # draw selected in green
            cv2.drawContours(vis, [approx], -1, (0, 255, 0), 4)
            break

    debug_assets["contours"] = save_debug(vis, "2_contours")

    if quad is None:
        info["reason"] = "no 4-corner polygon above area threshold"
        return bgr, debug_assets, info

    warped = four_point_transform(orig, quad)
    debug_assets["warped_raw"] = save_debug(warped, "3_warped")

    # Normalize orientation: ensure width > height if your card is landscape
    h, w = warped.shape[:2]
    if h > w:
        warped = cv2.rotate(warped, cv2.ROTATE_90_CLOCKWISE)

    info["card_found"] = True
    return warped, debug_assets, info

def normalize_canvas(img):
    """Optional: resize to fixed canvas after warp for easier visual tuning."""
    if not USE_FIXED_CANVAS:
        return img
    target_w, target_h = TARGET_SIZE
    return cv2.resize(img, (target_w, target_h), interpolation=cv2.INTER_CUBIC)

def get_roi_pixels(img, roi_pct):
    h, w = img.shape[:2]
    x = int(w * roi_pct[0])
    y = int(h * roi_pct[1])
    ww = int(w * roi_pct[2])
    hh = int(h * roi_pct[3])
    # clamp
    x = max(0, min(x, w - 1)); y = max(0, min(y, h - 1))
    ww = max(1, min(ww, w - x)); hh = max(1, min(hh, h - y))
    return (x, y, ww, hh)

def read_roi_text(img, roi_rect):
    x, y, ww, hh = roi_rect
    crop = img[y:y+hh, x:x+ww]
    # If crop degenerate, return empty
    if crop.size == 0 or crop.shape[0] < 10 or crop.shape[1] < 10:
        return ""

    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

    # Adaptive threshold is good for uneven lighting
    processed = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 35, 15
    )
    # Optional mild dilation can connect broken characters
    # kernel = np.ones((1,1), np.uint8)
    # processed = cv2.dilate(processed, kernel, iterations=1)

    text = pytesseract.image_to_string(processed, lang="eng", config="--psm 6")
    return text.strip()

def draw_debug_overlays(base, qr_bbox, qr_text, roi_rects, active_keys=None):
    """Return an image with QR bbox + ROI boxes for debug."""
    overlay = base.copy()

    # QR overlay
    if qr_bbox is not None and len(qr_bbox) > 0:
        bb = np.int32(qr_bbox).reshape(-1, 2)
        for i in range(len(bb)):
            cv2.line(overlay, tuple(bb[i]), tuple(bb[(i + 1) % len(bb)]), (255, 0, 0), 3)
        cv2.putText(overlay, "QR FOUND", (bb[0][0], bb[0][1] - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 2)
        if qr_text:
            cv2.putText(overlay, f"Data: {qr_text[:40]}...", (bb[0][0], bb[0][1] + 28),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
    else:
        cv2.putText(overlay, "NO QR DETECTED", (40, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

    # ROI overlay
    for k, (x, y, w, h) in roi_rects.items():
        if active_keys is not None and k not in active_keys:
            continue
        cv2.rectangle(overlay, (x, y), (x + w, y + h), (0, 255, 0), 2)
        cv2.putText(overlay, k, (x, y - 6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

    return overlay

def resize_to_height(img, target_h):
    """Resize image to target height while keeping aspect ratio."""
    h, w = img.shape[:2]
    if h == 0 or w == 0:
        return img
    if h == target_h:
        return img
    scale = target_h / float(h)
    new_w = max(1, int(round(w * scale)))
    interpolation = cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC
    return cv2.resize(img, (new_w, target_h), interpolation=interpolation)

def save_side_by_side_output(front_img, back_img):
    """Create and persist a side-by-side image using the processed front & back."""
    target_h = max(front_img.shape[0], back_img.shape[0])
    left = resize_to_height(front_img, target_h)
    right = resize_to_height(back_img, target_h)
    combined = np.hstack((left, right))

    filename = unique_name("output", "jpg")
    path = os.path.join(OUTPUT_DIR, filename)
    cv2.imwrite(path, combined)

    latest_symlink = os.path.join(OUTPUT_DIR, "latest.jpg")
    try:
        shutil.copy(path, latest_symlink)
    except Exception:
        pass

    return filename, path

def get_debug_image_or_fallback(debug_files, key, fallback_img):
    """Attempt to load a debug image; fallback to provided np array."""
    debug_name = debug_files.get(key) if debug_files else None
    if debug_name:
        candidate_path = os.path.join(DEBUG_DIR, debug_name)
        if os.path.exists(candidate_path):
            debug_img = cv2.imread(candidate_path)
            if debug_img is not None:
                return debug_img
    return fallback_img

def save_uploaded_file(file_storage, prefix):
    """Persist upload using a normalized extension returned as a local path."""
    ext = os.path.splitext(file_storage.filename or "")[1].lower().lstrip(".")
    if ext not in {"jpg", "jpeg", "png", "pdf"}:
        ext = "jpg"

    safe_name = unique_name(prefix, ext)
    save_path = os.path.join(UPLOAD_DIR, safe_name)
    file_storage.save(save_path)
    return save_path

def persist_output_payload(payload):
    """Write OCR payload to outputs as JSON and text copies, returning filenames."""
    json_filename = unique_name("ocr", "json")
    json_path = os.path.join(OUTPUT_DIR, json_filename)
    serialized = json.dumps(payload, ensure_ascii=False, indent=2)

    with open(json_path, "w", encoding="utf-8") as fh:
        fh.write(serialized)

    latest_json = os.path.join(OUTPUT_DIR, "latest.json")
    latest_txt = os.path.join(OUTPUT_DIR, "latest.txt")
    try:
        shutil.copy(json_path, latest_json)
    except Exception:
        pass

    with open(latest_txt, "w", encoding="utf-8") as fh:
        fh.write(serialized)

    return json_filename, json_path

def extract_demographic_fields(results):
    """Return name/dob/aadhaar/gender only from pages where QR was not detected."""
    keys = ("name", "dob", "aadhaar", "gender")
    extracted = {key: "" for key in keys}

    for result in results:
        if result.get("qr_detected"):
            continue
        fields = result.get("fields", {})
        for key in keys:
            if not extracted[key]:
                value = fields.get(key, "")
                if value:
                    extracted[key] = value
    return extracted

def extract_address_from_results(results):
    """Return the first available address from pages where QR was detected."""
    for result in results:
        if not result.get("qr_detected"):
            continue
        fields = result.get("fields", {})
        address = fields.get("address", "")
        if address:
            return address
    return ""

def process_page_bgr(bgr):
    """
    Full pipeline for a single page/image:
    1) Detect card + warp
    2) Normalize canvas (optional)
    3) QR detection
    4) Conditional ROI OCR (address only if QR; else other fields)
    5) Debug assets
    """
    debug_assets = {}

    # 1) Detect & warp
    warped, warp_debug, warp_info = detect_and_warp_card(bgr)
    debug_assets.update({f"warp_{k}": v for k, v in warp_debug.items()})

    # 2) Normalize
    norm = normalize_canvas(warped)
    debug_assets["warped_final"] = save_debug(norm, "4_warped_final")

    # 3) QR detection on normalized card
    qr = cv2.QRCodeDetector()
    qr_data, qr_bbox, _ = qr.detectAndDecode(norm)
    qr_detected = qr_bbox is not None and len(qr_bbox) > 0

    # 4) ROI OCR logic
    roi_rects = {k: get_roi_pixels(norm, p) for k, p in ROI_PERCENTS.items()}

    fields = {}
    active_roi_keys = []
    if qr_detected:
        # only address
        if "address" in roi_rects:
            fields["address"] = read_roi_text(norm, roi_rects["address"])
            active_roi_keys.append("address")
        else:
            fields["note"] = "address ROI not defined"
    else:
        # all except address
        for k, rect in roi_rects.items():
            if k == "address":
                continue
            fields[k] = read_roi_text(norm, rect)
            active_roi_keys.append(k)

    # 5) Debug overlay combining QR + ROI
    overlay = draw_debug_overlays(norm, qr_bbox, qr_data, roi_rects, active_roi_keys or None)
    debug_assets["overlay"] = save_debug(overlay, "5_overlay")

    result = {
        "card_found": warp_info["card_found"],
        "card_reason": warp_info.get("reason", ""),
        "qr_detected": bool(qr_detected),
        "qr_data": qr_data if qr_data else "",
        "fields": fields,
        "debug_images": debug_assets  # filenames; serve via /debug/<name>
    }
    return result

def load_images_from_upload(path):
    """
    For a given saved upload path:
      - If PDF -> convert pages to BGR np arrays
      - If image -> single BGR np array
    """
    ext = os.path.splitext(path)[1].lower()
    if ext == ".pdf":
        pages = convert_from_path(path, dpi=300)
        return [cv2.cvtColor(np.array(p), cv2.COLOR_RGB2BGR)]
    else:
        data = np.fromfile(path, dtype=np.uint8)
        bgr = cv2.imdecode(data, cv2.IMREAD_COLOR)
        if bgr is None:
            raise ValueError("Unsupported or corrupted image")
        return [bgr]

# ========= Routes =========

@app.route("/api/ocr/extract", methods=["POST"])
def extract_text():
    front_file = request.files.get("front")
    back_file = request.files.get("back")

    if front_file is None or back_file is None:
        return jsonify({"error": "Both front and back images are required (fields: front, back)."}), 400

    if not front_file.filename or not back_file.filename:
        return jsonify({"error": "Uploaded files must include filenames."}), 400

    front_path = save_uploaded_file(front_file, "front")
    back_path = save_uploaded_file(back_file, "back")

    try:
        front_pages = load_images_from_upload(front_path)
        back_pages = load_images_from_upload(back_path)

        if not front_pages or not back_pages:
            return jsonify({"error": "Unable to decode one of the provided images."}), 400

        front_bgr = front_pages[0]
        back_bgr = back_pages[0]

        front_result = process_page_bgr(front_bgr)
        back_result = process_page_bgr(back_bgr)

        # default to overlay debug image for combined preview; fallback to raw if missing
        front_for_output = get_debug_image_or_fallback(front_result.get("debug_images"), "overlay", front_bgr)
        back_for_output = get_debug_image_or_fallback(back_result.get("debug_images"), "overlay", back_bgr)
        image_filename, _ = save_side_by_side_output(front_for_output, back_for_output)

        demographic_fields = extract_demographic_fields([front_result, back_result])
        address_value = extract_address_from_results([front_result, back_result])
        combined_extracted = {
            **demographic_fields,
            "address": address_value,
            "phone": "",
        }

        payload = {
            "timestamp": int(time.time()),
            "front": front_result,
            "back": back_result,
            "extracted": combined_extracted,
        }
        text_filename, _ = persist_output_payload(payload)

        response_body = {
            "extracted": combined_extracted,
            "front": front_result,
            "back": back_result,
            "output_text_url": f"/outputs/{text_filename}",
            "output_image_url": f"/outputs/{image_filename}",
        }
        return jsonify(response_body)

    except Exception as e:
        print("❌ OCR Error:", e)
        return jsonify({"error": str(e)}), 500

    finally:
        for path in (front_path, back_path):
            if os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass

@app.route("/debug/<path:filename>")
def get_debug_file(filename):
    return send_from_directory(DEBUG_DIR, filename)

@app.route("/outputs/<path:filename>")
def get_output_file(filename):
    return send_from_directory(OUTPUT_DIR, filename)

@app.route("/")
def home():
    return jsonify({
        "message": "✅ OCR backend running (card warp + QR-conditional ROI + % ROIs)",
        "usage": "POST /api/ocr/extract with form-data: front=<image>, back=<image>",
        "debug_view": "GET /debug/<filename> from debug_images in response",
        "output_view": "GET /outputs/<filename> for combined previews or JSON dumps"
    })

# ========= Main =========
if __name__ == "__main__":
    # Ensure Tesseract is available (optional soft check)
    # You can uncomment to log version:
    # try:
    #     import subprocess
    #     print(subprocess.check_output(["tesseract", "--version"]).decode().splitlines()[0])
    # except Exception:
    #     print("⚠️ Tesseract not found on PATH. Ensure it's installed.")

    app.run(host="0.0.0.0", port=5001, debug=True)
