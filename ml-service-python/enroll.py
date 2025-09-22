import cv2
import dlib
import numpy as np
import os
import yaml

with open('config.yaml', 'r') as f:
    config = yaml.safe_load(f)

face_detector = dlib.get_frontal_face_detector()
shape_predictor = dlib.shape_predictor('models/shape_predictor_68_face_landmarks.dat')
face_recognizer = dlib.face_recognition_model_v1('models/dlib_face_recognition_resnet_model_v1.dat')

def enroll_face_from_images(user_id, image_folder):
    """Enroll a single person from their image folder."""
    embeddings = []
    if not os.path.exists(image_folder):
        print(f"Error: Image folder '{image_folder}' not found.")
        return False
    
    image_files = [f for f in os.listdir(image_folder) if f.lower().endswith(('.jpg', '.png', '.jpeg'))]
    if not image_files:
        print(f"No images found in {image_folder}")
        return False
    
    for filename in image_files:
        image_path = os.path.join(image_folder, filename)
        image = cv2.imread(image_path)
        if image is None:
            print(f"Skipping {filename}: Unable to read image.")
            continue
        
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        faces = face_detector(rgb)
        if len(faces) == 1:
            shape = shape_predictor(rgb, faces[0])
            embedding = np.array(face_recognizer.compute_face_descriptor(rgb, shape))
            embeddings.append(embedding)
        else:
            print(f"Skipping {filename}: Detected {len(faces)} faces (need exactly 1).")
    
    if embeddings:
        avg_embedding = np.mean(embeddings, axis=0)
        os.makedirs('embeddings', exist_ok=True)
        np.save(f'embeddings/{user_id}.npy', avg_embedding)
        print(f"✓ Enrolled {user_id} from {len(embeddings)} images")
        return True
    else:
        print(f"✗ Failed to enroll {user_id}: No valid images processed")
        return False

def enroll_all_people():
    """Automatically enroll all people from their respective folders."""
    images_base_folder = 'images'
    prof_images_base_folder = 'prof_images'
    
    successful_enrollments = 0
    failed_enrollments = 0
    
    # Enroll students
    if os.path.exists(images_base_folder):
        person_folders = [folder for folder in os.listdir(images_base_folder) 
                         if os.path.isdir(os.path.join(images_base_folder, folder))]
        
        for person_name in person_folders:
            person_folder_path = os.path.join(images_base_folder, person_name)
            success = enroll_face_from_images(person_name, person_folder_path)
            if success:
                successful_enrollments += 1
            else:
                failed_enrollments += 1
    
    # Enroll professors
    if os.path.exists(prof_images_base_folder):
        subject_folders = [folder for folder in os.listdir(prof_images_base_folder) 
                          if os.path.isdir(os.path.join(prof_images_base_folder, folder))]
        
        for subject in subject_folders:
            subject_folder_path = os.path.join(prof_images_base_folder, subject)
            success = enroll_face_from_images(subject, subject_folder_path)
            if success:
                successful_enrollments += 1
            else:
                failed_enrollments += 1
    
    print(f"\nEnrollment Summary:")
    print(f"✓ Successful: {successful_enrollments}")
    print(f"✗ Failed: {failed_enrollments}")
    
    if successful_enrollments > 0:
        print(f"\nEmbedding files created in embeddings/ folder:")
        # List all embedding files
        if os.path.exists('embeddings'):
            for embedding_file in os.listdir('embeddings'):
                if embedding_file.endswith('.npy'):
                    print(f"  - embeddings/{embedding_file}")
    
    return successful_enrollments

# Run automatic enrollment for all people
if __name__ == "__main__":
    enroll_all_people()