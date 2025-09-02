import sys
from components.postgres.chat_queries import (
    get_sessions_db,
    create_session_db,
    get_messages_db,
    add_user_message_db,
    add_ai_message_db
)
from components.llm_models.gemini_flash import get_gemini_response, get_gemini_response_stream

def list_sessions(user_id):
    return get_sessions_db(user_id)

def create_new_session(user_id, title):
    return create_session_db(user_id, title)

def list_messages(session_id, user_id):
    return get_messages_db(session_id)

def handle_user_message(session_id, user_id, text):
    msg_id = add_user_message_db(session_id, text)
    # Get socketio instance at runtime
    socketio = sys.modules.get('server_socketio')
    if socketio:
        import time
        # Stream AI response in chunks with delay
        ai_text_chunks = []
        for chunk in get_gemini_response_stream(text):
            ai_text_chunks.append(chunk)
            socketio.emit('ai:response:chunk', {
                'session_id': session_id,
                'chunk': chunk
            }, room=str(user_id))
            time.sleep(0.5)  # 500ms delay per chunk for readable streaming
        ai_text = ''.join(ai_text_chunks)
        ai_msg_id = add_ai_message_db(session_id, ai_text)
        socketio.emit('ai:response:end', {
            'session_id': session_id,
            'message': {'id': ai_msg_id, 'sender': 'AI', 'text': ai_text}
        }, room=str(user_id))
        return {'user_msg_id': msg_id, 'ai_msg_id': ai_msg_id, 'ai_text': ai_text}
    else:
        # Fallback: no socketio, just return full response
        ai_text = get_gemini_response(text)
        ai_msg_id = add_ai_message_db(session_id, ai_text)
        return {'user_msg_id': msg_id, 'ai_msg_id': ai_msg_id, 'ai_text': ai_text}