from components.postgres.postgres_conn_utils import get_db

def get_user_by_email_db(email):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id, password_hash FROM users WHERE email=%s", (email,))
    return cur.fetchone()

def user_exists_db(email):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id FROM users WHERE email=%s", (email,))
    return cur.fetchone() is not None

def create_user_db(email, password_hash):
    db = get_db()
    cur = db.cursor()
    cur.execute("INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id", (email, password_hash))
    user_id = cur.fetchone()[0]
    db.commit()
    return user_id

def update_last_login_db(user_id):
    db = get_db()
    cur = db.cursor()
    cur.execute("UPDATE users SET last_login_at=NOW() WHERE id=%s", (user_id,))
    db.commit()
