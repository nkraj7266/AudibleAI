from components.postgres.postgres_conn_utils import get_db
import uuid
import logging
from logging_config import app_logger, error_logger

def get_sessions_db(user_id):
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT id, title FROM chatsessions WHERE user_id=%s", (user_id,))
        return [{'id': r[0], 'title': r[1]} for r in cur.fetchall()]
    except Exception as e:
        error_logger.error(f"get_sessions_db error: {e}", exc_info=True)
        return []

def create_session_db(user_id, title):
    try:
        db = get_db()
        cur = db.cursor()
        session_id = str(uuid.uuid4())
        cur.execute("INSERT INTO chatsessions (id, user_id, title) VALUES (%s, %s, %s)", (session_id, user_id, title))
        db.commit()
        return session_id
    except Exception as e:
        error_logger.error(f"create_session_db error: {e}", exc_info=True)
        return None

def get_messages_db(session_id):
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute("SELECT id, sender, text, created_at FROM messages WHERE session_id=%s ORDER BY created_at ASC", (session_id,))
        return [{'id': r[0], 'sender': r[1], 'text': r[2], 'created_at': r[3]} for r in cur.fetchall()]
    except Exception as e:
        error_logger.error(f"get_messages_db error: {e}", exc_info=True)
        return []

def add_user_message_db(session_id, text):
    try:
        db = get_db()
        cur = db.cursor()
        msg_id = str(uuid.uuid4())
        cur.execute("INSERT INTO messages (id, session_id, sender, text) VALUES (%s, %s, %s, %s)", (msg_id, session_id, 'USER', text))
        db.commit()
        return msg_id
    except Exception as e:
        error_logger.error(f"add_user_message_db error: {e}", exc_info=True)
        return None

def add_ai_message_db(session_id, ai_text):
    try:
        db = get_db()
        cur = db.cursor()
        ai_msg_id = str(uuid.uuid4())
        cur.execute("INSERT INTO messages (id, session_id, sender, text) VALUES (%s, %s, %s, %s)", (ai_msg_id, session_id, 'AI', ai_text))
        db.commit()
        return ai_msg_id
    except Exception as e:
        error_logger.error(f"add_ai_message_db error: {e}", exc_info=True)
        return None

def delete_session_db(session_id, user_id):
    try:
        db = get_db()
        cur = db.cursor()
        # Only allow user to delete their own session
        cur.execute("DELETE FROM chatsessions WHERE id=%s AND user_id=%s", (session_id, user_id))
        db.commit()
        return cur.rowcount > 0
    except Exception as e:
        error_logger.error(f"delete_session_db error: {e}", exc_info=True)
        return False

def update_session_title_db(session_id, user_id, new_title):
    try:
        db = get_db()
        cur = db.cursor()
        # Only allow user to update their own session
        cur.execute("UPDATE chatsessions SET title=%s WHERE id=%s AND user_id=%s", (new_title, session_id, user_id))
        db.commit()
        return cur.rowcount > 0
    except Exception as e:
        error_logger.error(f"update_session_title_db error: {e}", exc_info=True)
        return False
