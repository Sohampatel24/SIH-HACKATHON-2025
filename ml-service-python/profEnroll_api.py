from flask import Flask, request, jsonify
import os, pickle
from werkzeug.utils import secure_filename
from enroll import enroll_face_from_images
from recognize import load_embeddings

app = Flask(__name__)
UPLOAD_FOLDER = "prof_images"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/enroll-professor", methods=["POST"])
def enroll_professor():
    name = request.form.get("name")
    subject = request.form.get("subject")
    
    if not name or not subject:
        return jsonify({"error": "Missing name or subject"}), 400

    files = request.files.getlist("photos")
    if not files:
        return jsonify({"error": "No photo files"}), 400

    # Create folder using subject as identifier
    person_dir = os.path.join(UPLOAD_FOLDER, subject)
    os.makedirs(person_dir, exist_ok=True)
    
    # Save uploaded files
    for f in files:
        filename = secure_filename(f.filename)
        f.save(os.path.join(person_dir, filename))

    # Enroll using subject as identifier
    success = enroll_face_from_images(subject, person_dir)
    if not success:
        return jsonify({"error": "Enrollment failed"}), 500

    # regenerate model.pkl (same as students)
    index, ids = load_embeddings()
    with open("model.pkl", "wb") as pf:
        pickle.dump((index, ids), pf)

    return jsonify({"message": f"Enrolled Professor {name} for subject {subject}"}), 200

if __name__ == "__main__":
    app.run(port=5003, debug=True)