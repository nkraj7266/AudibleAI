from components.postgres.postgres_conn_utils import get_db
import uuid
import logging
from logging_config import app_logger, error_logger

def get_sessions_db(user_id):
    try:
        db = get_db()
        cur = db.cursor()
        app_logger.info(f"DB Query: Fetching chat sessions for user ID: {user_id}")
        cur.execute("SELECT id, title FROM chatsessions WHERE user_id=%s", (user_id,))
        sessions = [{'id': r[0], 'title': r[1]} for r in cur.fetchall()]
        app_logger.info(f"DB Query: Found {len(sessions)} chat sessions")
        return sessions
    except Exception as e:
        error_logger.error(f"get_sessions_db error: {e}", exc_info=True)
        return []

def create_session_db(user_id, title):
    try:
        db = get_db()
        cur = db.cursor()
        session_id = str(uuid.uuid4())
        app_logger.info(f"DB Query: Creating new chat session for user ID: {user_id}, title: {title}")
        cur.execute("INSERT INTO chatsessions (id, user_id, title) VALUES (%s, %s, %s)", (session_id, user_id, title))
        db.commit()
        app_logger.info(f"DB Query: Successfully created chat session with ID: {session_id}")
        return session_id
    except Exception as e:
        error_logger.error(f"create_session_db error: {e}", exc_info=True)
        return None

def get_messages_db(session_id):
    try:
        db = get_db()
        cur = db.cursor()
        app_logger.info(f"DB Query: Fetching messages for session ID: {session_id}")
        cur.execute("SELECT id, sender, text, created_at FROM messages WHERE session_id=%s ORDER BY created_at ASC", (session_id,))
        messages = [{'id': r[0], 'sender': r[1], 'text': r[2], 'created_at': r[3]} for r in cur.fetchall()]
        app_logger.info(f"DB Query: Found {len(messages)} messages in session")
        return messages
    except Exception as e:
        error_logger.error(f"get_messages_db error: {e}", exc_info=True)
        return []

def add_user_message_db(session_id, text):
    try:
        db = get_db()
        cur = db.cursor()
        msg_id = str(uuid.uuid4())
        app_logger.info(f"DB Query: Adding user message in session ID: {session_id}")
        cur.execute("INSERT INTO messages (id, session_id, sender, text) VALUES (%s, %s, %s, %s)", (msg_id, session_id, 'USER', text))
        db.commit()
        app_logger.info(f"DB Query: Successfully added user message with ID: {msg_id}")
        return msg_id
    except Exception as e:
        error_logger.error(f"add_user_message_db error: {e}", exc_info=True)
        return None

def add_ai_message_db(session_id, ai_text):
    try:
        db = get_db()
        cur = db.cursor()
        ai_msg_id = str(uuid.uuid4())
        app_logger.info(f"DB Query: Adding AI message in session ID: {session_id}")
        cur.execute("INSERT INTO messages (id, session_id, sender, text) VALUES (%s, %s, %s, %s)", (ai_msg_id, session_id, 'AI', ai_text))
        db.commit()
        app_logger.info(f"DB Query: Successfully added AI message with ID: {ai_msg_id}")
        return ai_msg_id
    except Exception as e:
        error_logger.error(f"add_ai_message_db error: {e}", exc_info=True)
        return None

def delete_session_db(session_id, user_id):
    try:
        db = get_db()
        cur = db.cursor()
        app_logger.info(f"DB Query: Deleting chat session ID: {session_id} for user ID: {user_id}")
        # Only allow user to delete their own session
        cur.execute("DELETE FROM chatsessions WHERE id=%s AND user_id=%s", (session_id, user_id))
        db.commit()
        success = cur.rowcount > 0
        app_logger.info(f"DB Query: Session deletion {'successful' if success else 'failed - session not found or not owned by user'}")
        return success
    except Exception as e:
        error_logger.error(f"delete_session_db error: {e}", exc_info=True)
        return False

def update_session_title_db(session_id, user_id, new_title):
    try:
        db = get_db()
        cur = db.cursor()
        app_logger.info(f"DB Query: Updating title of session ID: {session_id} for user ID: {user_id}")
        # Only allow user to update their own session
        cur.execute("UPDATE chatsessions SET title=%s WHERE id=%s AND user_id=%s", (new_title, session_id, user_id))
        db.commit()
        success = cur.rowcount > 0
        app_logger.info(f"DB Query: Title update {'successful' if success else 'failed - session not found or not owned by user'}")
        return success
    except Exception as e:
        error_logger.error(f"update_session_title_db error: {e}", exc_info=True)
        return False
