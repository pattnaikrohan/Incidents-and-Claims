import sqlite3
import bcrypt

def seed_user():
    print("Seeding test user into sql_app.db using direct bcrypt...")
    conn = sqlite3.connect("sql_app.db")
    cursor = conn.cursor()
    
    # Ensure tables exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users';")
    if not cursor.fetchone():
        print("Table 'users' does not exist yet. Please start the backend once to initialize SQLAlchemy models.")
        conn.close()
        return

    # Delete existing test@mfiles.com to ensure fresh password
    cursor.execute("DELETE FROM users WHERE email='test@mfiles.com'")
    
    # Generate hash using bcrypt directly
    password = b"password"
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password, salt).decode('utf-8')
    
    # Insert user
    cursor.execute("INSERT INTO users (email, name, hashed_password, role, branch_id) VALUES (?, ?, ?, ?, ?)",
                   ('test@mfiles.com', 'Test User', hashed, 'risk_compliance', 1))
    
    conn.commit()
    conn.close()
    print("User test@mfiles.com / password seeded successfully.")

if __name__ == "__main__":
    seed_user()
