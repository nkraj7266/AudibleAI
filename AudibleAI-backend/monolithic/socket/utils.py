import time
import logging
from logging_config import app_logger, error_logger

def emit_stream_chunks(socketio, user_id, session_id, chunks, delay=0.5):
    """
    Emits AI response chunks to the user room with a delay for readable streaming.
    """
    try:
        room = get_user_room(user_id)
        for chunk in chunks:
            socketio.emit('ai:response:chunk', {
                'session_id': session_id,
                'chunk': chunk
            }, room=room)
            time.sleep(delay)
        app_logger.info(f"Emitted {len(chunks)} AI response chunks to user_id: {user_id}, session_id: {session_id}")
    except Exception as e:
        error_logger.error(f"emit_stream_chunks error: {e}", exc_info=True)

def get_user_room(user_id):
    """
    Returns the standardized room name for a user.
    """
    try:
        return str(user_id)
    except Exception as e:
        error_logger.error(f"get_user_room error: {e}", exc_info=True)
        return "unknown"

def emit_response_end(socketio, user_id, session_id, ai_msg_id, ai_text):
    """
    Emits the final AI response message to the user room.
    """
    try:
        room = get_user_room(user_id)
        socketio.emit('ai:response:end', {
            'session_id': session_id,
            'message': {
                'id': ai_msg_id,
                'sender': 'AI',
                'text': ai_text
            }
        }, room=room)
        app_logger.info(f"Emitted AI response end to user_id: {user_id}, session_id: {session_id}")
    except Exception as e:
        error_logger.error(f"emit_response_end error: {e}", exc_info=True)
