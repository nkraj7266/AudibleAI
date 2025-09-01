from components.postgres.chat_queries import (
    get_sessions_db,
    create_session_db,
    get_messages_db,
    add_user_message_db,
    add_ai_message_db
)
from server import socketio
from components.llm_models.gemini_flash import get_gemini_response

def list_sessions(user_id):
    return get_sessions_db(user_id)

def create_new_session(user_id, title):
    return create_session_db(user_id, title)

def list_messages(session_id, user_id):
    return get_messages_db(session_id)

def handle_user_message(session_id, user_id, text):
    msg_id = add_user_message_db(session_id, text)
    ai_text = get_gemini_response(text)
    ai_msg_id = add_ai_message_db(session_id, ai_text)
    socketio.emit('chat:ai_response', {
        'session_id': session_id,
        'message': {'id': ai_msg_id, 'sender': 'AI', 'text': ai_text}
    }, room=str(user_id))
    return {'user_msg_id': msg_id, 'ai_msg_id': ai_msg_id, 'ai_text': ai_text}