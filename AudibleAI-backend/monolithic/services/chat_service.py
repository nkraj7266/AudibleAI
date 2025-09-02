import sys
from components.postgres.chat_queries import (
    get_sessions_db,
    create_session_db,
    get_messages_db,
    add_user_message_db,
    add_ai_message_db,
    delete_session_db,
    update_session_title_db
)
from components.llm_models.gemini_flash import get_gemini_response_stream, get_gemini_response

def list_sessions(user_id):
    return get_sessions_db(user_id)

def create_new_session(user_id, title):
    return create_session_db(user_id, title)

def list_messages(session_id, user_id):
    return get_messages_db(session_id)

def handle_user_message(session_id, user_id, text, is_first_message=False):
    msg_id = add_user_message_db(session_id, text)
    ai_text_chunks = [chunk for chunk in get_gemini_response_stream(text)] # Streamed chunks
    ai_text = ''.join(ai_text_chunks)
    ai_msg_id = add_ai_message_db(session_id, ai_text)

    # Auto-generate session title if flagged as first message
    if is_first_message:
        prompt = f"Generate strictly only one concise chat title, 3-4 words only, plain text, no symbols for this conversation: {ai_text}"
        new_title = get_gemini_response(prompt)
        update_session_title_db(session_id, user_id, new_title)
        try:
            socketio = sys.modules.get('server_socketio')
            if socketio:
                socketio.emit('session:title:update', {
                    'session_id': session_id,
                    'title': new_title
                }, room=str(user_id))
        except Exception as e:
            print(f"[Socket Emit Error]: {e}")

    return {
        'user_msg_id': msg_id,
        'ai_msg_id': ai_msg_id,
        'ai_text': ai_text,
        'ai_text_chunks': ai_text_chunks
    }

def delete_session(session_id, user_id):
    return delete_session_db(session_id, user_id)

def update_session_title(session_id, user_id, new_title):
    return update_session_title_db(session_id, user_id, new_title)