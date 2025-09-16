# recognize.py (cleaned)
import cv2
import dlib
import numpy as np
import faiss
import os
import yaml

with open('config.yaml', 'r') as f:
    config = yaml.safe_load(f)

face_detector = dlib.get_frontal_face_detector()
shape_predictor = dlib.shape_predictor('models/shape_predictor_68_face_landmarks.dat')
face_recognizer = dlib.face_recognition_model_v1('models/dlib_face_recognition_resnet_model_v1.dat')

def load_embeddings():
    """
    Load embeddings from embeddings/*.npy into a FAISS index and return (index, ids).
    If no embeddings folder or empty, returns an empty index and empty ids list.
    """
    emb_dir = 'embeddings'
    if not os.path.exists(emb_dir):
        os.makedirs(emb_dir, exist_ok=True)

    index = faiss.IndexFlatL2(128)
    ids = []
    for file in sorted(os.listdir(emb_dir)):
        if file.endswith('.npy'):
            emb = np.load(os.path.join(emb_dir, file))
            if emb.shape[0] == 128:
                index.add(emb.reshape(1, -1))
                ids.append(file.split('.')[0])
    return index, ids

def recognize_from_image(image, index, ids):
    """
    image: BGR numpy image (cv2)
    index, ids: FAISS index and list of ids
    Returns: (box, user_id, dist) for the first matched face, or (None, None, None)
    """
    if image is None:
        return None, None, None

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    faces = face_detector(rgb)
    results = []
    for face in faces:
        shape = shape_predictor(rgb, face)
        embedding = np.array(face_recognizer.compute_face_descriptor(rgb, shape)).reshape(1, -1)
        if index.ntotal == 0:
            # No known embeddings
            continue
        distances, indices = index.search(embedding.astype('float32'), 1)
        dist = float(distances[0][0])
        if dist < config['thresholds']['distance']:
            user_id = ids[indices[0][0]]
            box = (face.left(), face.top(), face.right(), face.bottom())
            results.append((box, user_id, dist))
    if results:
        return results[0]
    return None, None, None