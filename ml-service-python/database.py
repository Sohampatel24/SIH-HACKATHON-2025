import datetime

def log_attendance(user_id, timestamp):
    """Log attendance to console (no DB for now)."""
    print(f"Attendance marked for {user_id} at {timestamp}")
    # You can add file logging here later if needed
