from app.core.database import SessionLocal
from app.models.users import User
from app.core import security

db = SessionLocal()
try:
    user = db.query(User).filter(User.email == "test@mfiles.com").first()
    if user:
        print(f"Updating user: {user.email}")
        user.hashed_password = security.get_password_hash("password")
        db.commit()
        print("Password updated successfully.")
    else:
        print("User not found.")
finally:
    db.close()
