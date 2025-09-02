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
import logging
from logging_config import app_logger, error_logger

def list_sessions(user_id):
    try:
        app_logger.info(f"Listing sessions for user_id: {user_id}")
        return get_sessions_db(user_id)
    except Exception as e:
        error_logger.error(f"list_sessions error: {e}", exc_info=True)
        return []

def create_new_session(user_id, title):
    try:
        app_logger.info(f"Creating new session for user_id: {user_id}, title: {title}")
        return create_session_db(user_id, title)
    except Exception as e:
        error_logger.error(f"create_new_session error: {e}", exc_info=True)
        return None

def list_messages(session_id, user_id):
    try:
        app_logger.info(f"Listing messages for session_id: {session_id}, user_id: {user_id}")
        return get_messages_db(session_id)
    except Exception as e:
        error_logger.error(f"list_messages error: {e}", exc_info=True)
        return []

def handle_user_message(session_id, user_id, text, is_first_message=False):
    try:
        app_logger.info(f"Handling user message for session_id: {session_id}, user_id: {user_id}")
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
                error_logger.error(f"Socket Emit Error: {e}", exc_info=True)

        return {
            'user_msg_id': msg_id,
            'ai_msg_id': ai_msg_id,
            'ai_text': ai_text,
            'ai_text_chunks': ai_text_chunks
        }
    except Exception as e:
        error_logger.error(f"handle_user_message error: {e}", exc_info=True)
        return {'error': str(e)}

def delete_session(session_id, user_id):
    try:
        app_logger.info(f"Deleting session {session_id} for user_id: {user_id}")
        return delete_session_db(session_id, user_id)
    except Exception as e:
        error_logger.error(f"delete_session error: {e}", exc_info=True)
        return False

def update_session_title(session_id, user_id, new_title):
    try:
        app_logger.info(f"Updating session title for session_id: {session_id}, user_id: {user_id}, new_title: {new_title}")
        return update_session_title_db(session_id, user_id, new_title)
    except Exception as e:
        error_logger.error(f"update_session_title error: {e}", exc_info=True)
        return False