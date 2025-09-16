# video_recognize_api.py
from flask import Flask, request, jsonify
import os, tempfile, time
import cv2
import base64
import pickle
from recognize import load_embeddings, recognize_from_image

app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Load model each request (or keep cached)
MODEL_PATH = "model.pkl"

def load_model():
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, "rb") as f:
            return pickle.load(f)  # index, ids
    else:
        # fallback to building from embeddings
        return load_embeddings()

@app.route("/video_recognize", methods=["POST"])
def video_recognize():
    """
    Expects multipart/form-data:
      - file: uploaded video file (mp4/avi)
      - sample_fps (optional): how many frames per second to sample (default 1)
      - min_confidence_frames (optional): min frames of presence to mark attendance (default 1)
    Returns JSON:
      { "detected": { "Person A": { "count": N, "times": [ ... ] }, ... }, "summary": [ ... ] }
    """
    # Save uploaded file
    if 'file' not in request.files:
        return jsonify({"error": "No file field"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    sample_fps = float(request.form.get('sample_fps', 1.0))  # frames per second to sample
    min_frames = int(request.form.get('min_confidence_frames', 1))

    tmp_path = os.path.join(UPLOAD_FOLDER, f"{int(time.time())}_{file.filename}")
    file.save(tmp_path)

    # load model
    index, ids = load_model()

    # Open video
    cap = cv2.VideoCapture(tmp_path)
    if not cap.isOpened():
        os.remove(tmp_path)
        return jsonify({"error": "Failed to open video"}), 500

    video_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    if video_fps <= 0:
        video_fps = 25.0

    # Compute frame step
    # sample_fps frames per second -> skip_step = round(video_fps / sample_fps)
    skip_step = max(1, int(round(video_fps / sample_fps)))

    frame_index = 0
    detected_counts = {}  # name -> count
    detected_times = {}   # name -> list of timestamps (sec)

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = total_frames / video_fps if video_fps else 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_index % skip_step == 0:
            # optional: resize if huge for speed
            h, w = frame.shape[:2]
            max_dim = 800
            if max(h, w) > max_dim:
                scale = max_dim / max(h, w)
                frame = cv2.resize(frame, (int(w*scale), int(h*scale)))

            box, user_id, dist = recognize_from_image(frame, index, ids)
            if user_id:
                # record detection
                detected_counts[user_id] = detected_counts.get(user_id, 0) + 1
                time_sec = frame_index / video_fps
                detected_times.setdefault(user_id, []).append(round(time_sec, 2))
        frame_index += 1

    cap.release()
    try:
        os.remove(tmp_path)
    except Exception:
        pass

    # Build result: only include users with count >= min_frames
    detected = {}
    for user, cnt in detected_counts.items():
        if cnt >= min_frames:
            detected[user] = {"count": cnt, "times": detected_times.get(user, [])}

    # Make a summary list
    summary = [{"user": u, "count": detected[u]["count"], "times": detected[u]["times"]} for u in detected]

    return jsonify({"detected": detected, "summary": summary, "duration_sec": duration}), 200

if __name__ == "__main__":
    app.run(port=5002, debug=True)