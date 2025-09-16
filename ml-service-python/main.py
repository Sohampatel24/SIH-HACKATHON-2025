import cv2
import yaml
import time
import pickle   # <-- for saving model
from recognize import load_embeddings, recognize_from_image

with open('config.yaml', 'r') as f:
    config = yaml.safe_load(f)

index, ids = load_embeddings()

# ✅ Save model (index + ids) as pkl
with open("model.pkl", "wb") as f:
    pickle.dump((index, ids), f)

print("✅ Model (embeddings + IDs) saved as model.pkl")

# Initialize camera (0 for default webcam; replace with IP URL if needed)
cap = cv2.VideoCapture(0)

print("Starting real-time camera comparison. Press 'q' to quit.")

last_log_time = 0  # For debouncing logs
debounce_interval = 1  # Log every 1 second

while True:
    ret, frame = cap.read()
    if not ret:
        print("Camera error. Exiting.")
        break
    
    # Process frame
    box, user_id, dist = recognize_from_image(frame, index, ids)
    
    if user_id:
        current_time = time.time()
        if current_time - last_log_time > debounce_interval:
            print(f"Real-time match: {user_id}")
            last_log_time = current_time
        
        # Draw bounding box (green, thickness 2)
        if box:
            left, top, right, bottom = box
            cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
            
            # Label name and accuracy (distance as proxy)
            label = f"{user_id} (Acc: {1 - dist:.2f})"  # Accuracy as 1 - normalized dist (higher better)
            cv2.putText(frame, label, (left, top - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
    
    # Display the frame with annotations
    cv2.imshow('Real-Time Attendance Analysis', frame)
    
    # Quit on 'q' key
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
print("Camera session ended.")
