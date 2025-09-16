from flask import Flask, request, jsonify
import os, pickle
from werkzeug.utils import secure_filename
from enroll import enroll_face_from_images
from recognize import load_embeddings

app = Flask(__name__)
UPLOAD_FOLDER = "images"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/enroll", methods=["POST"])
def enroll():
    name = request.form.get("name")
    if not name:
        return jsonify({"error": "Missing name"}), 400

    # ✅ Fixed: field name should be "photos" (same as enroll.ejs & students.js)
    files = request.files.getlist("photos")
    if not files:
        return jsonify({"error": "No photo files"}), 400

    person_dir = os.path.join(UPLOAD_FOLDER, name)
    os.makedirs(person_dir, exist_ok=True)
    for f in files:
        filename = secure_filename(f.filename)
        f.save(os.path.join(person_dir, filename))

    success = enroll_face_from_images(name, person_dir)
    if not success:
        return jsonify({"error": "Enrollment failed"}), 500

    # regenerate model.pkl
    index, ids = load_embeddings()
    with open("model.pkl", "wb") as pf:
        pickle.dump((index, ids), pf)

    return jsonify({"message": f"Enrolled {name}"}), 200

if __name__ == "__main__":
    app.run(port=5001, debug=True)