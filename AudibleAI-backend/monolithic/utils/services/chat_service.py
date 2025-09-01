from components.postgres.postgres_conn_utils import get_db
from flask_socketio import SocketIO
import uuid

# Assume socketio is imported from server.py
from server import socketio

def list_sessions(user_id):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id, title FROM chatsessions WHERE user_id=%s", (user_id,))
    return [{'id': r[0], 'title': r[1]} for r in cur.fetchall()]

def create_new_session(user_id, title):
    db = get_db()
    cur = db.cursor()
    session_id = str(uuid.uuid4())
    cur.execute("INSERT INTO chatsessions (id, user_id, title) VALUES (%s, %s, %s)", (session_id, user_id, title))
    db.commit()
    return session_id

def list_messages(session_id, user_id):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id, sender, text, created_at FROM messages WHERE session_id=%s ORDER BY created_at ASC", (session_id,))
    return [{'id': r[0], 'sender': r[1], 'text': r[2], 'created_at': r[3]} for r in cur.fetchall()]

def handle_user_message(session_id, user_id, text):
    db = get_db()
    cur = db.cursor()
    msg_id = str(uuid.uuid4())
    cur.execute("INSERT INTO messages (id, session_id, sender, text) VALUES (%s, %s, %s, %s)", (msg_id, session_id, 'USER', text))
    db.commit()
    # Call Gemini API (mocked here)
    ai_text = get_gemini_response(text)
    ai_msg_id = str(uuid.uuid4())
    cur.execute("INSERT INTO messages (id, session_id, sender, text) VALUES (%s, %s, %s, %s)", (ai_msg_id, session_id, 'AI', ai_text))
    db.commit()
    # Emit AI response via Socket.IO
    socketio.emit('chat:ai_response', {
        'session_id': session_id,
        'message': {'id': ai_msg_id, 'sender': 'AI', 'text': ai_text}
    }, room=str(user_id))
    return {'user_msg_id': msg_id, 'ai_msg_id': ai_msg_id, 'ai_text': ai_text}

def get_gemini_response(text):
    # Replace with actual Gemini API call
    return f"Gemini response to: {text}"