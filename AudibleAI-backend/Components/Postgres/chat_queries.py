from components.postgres.postgres_conn_utils import get_db
import uuid

def get_sessions_db(user_id):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id, title FROM chatsessions WHERE user_id=%s", (user_id,))
    return [{'id': r[0], 'title': r[1]} for r in cur.fetchall()]

def create_session_db(user_id, title):
    db = get_db()
    cur = db.cursor()
    session_id = str(uuid.uuid4())
    cur.execute("INSERT INTO chatsessions (id, user_id, title) VALUES (%s, %s, %s)", (session_id, user_id, title))
    db.commit()
    return session_id

def get_messages_db(session_id):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id, sender, text, created_at FROM messages WHERE session_id=%s ORDER BY created_at ASC", (session_id,))
    return [{'id': r[0], 'sender': r[1], 'text': r[2], 'created_at': r[3]} for r in cur.fetchall()]

def add_user_message_db(session_id, text):
    db = get_db()
    cur = db.cursor()
    msg_id = str(uuid.uuid4())
    cur.execute("INSERT INTO messages (id, session_id, sender, text) VALUES (%s, %s, %s, %s)", (msg_id, session_id, 'USER', text))
    db.commit()
    return msg_id

def add_ai_message_db(session_id, ai_text):
    db = get_db()
    cur = db.cursor()
    ai_msg_id = str(uuid.uuid4())
    cur.execute("INSERT INTO messages (id, session_id, sender, text) VALUES (%s, %s, %s, %s)", (ai_msg_id, session_id, 'AI', ai_text))
    db.commit()
    return ai_msg_id

def delete_session_db(session_id, user_id):
    db = get_db()
    cur = db.cursor()
    # Only allow user to delete their own session
    cur.execute("DELETE FROM chatsessions WHERE id=%s AND user_id=%s", (session_id, user_id))
    db.commit()
    return cur.rowcount > 0

def update_session_title_db(session_id, user_id, new_title):
    db = get_db()
    cur = db.cursor()
    # Only allow user to update their own session
    cur.execute("UPDATE chatsessions SET title=%s WHERE id=%s AND user_id=%s", (new_title, session_id, user_id))
    db.commit()
    return cur.rowcount > 0
