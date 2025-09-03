import os
from flask_socketio import join_room
from monolithic.services.chat_service import handle_user_message
from monolithic.socket.utils import emit_stream_chunks, emit_response_end, get_user_room
import logging
from logging_config import app_logger, error_logger

def register_socket_events(socketio):
    @socketio.on('user:join')
    def on_join(data):
        try:
            user_id = data.get('user_id')
            app_logger.info(f"Socket user:join for user_id: {user_id}")
            if user_id:
                join_room(get_user_room(user_id))
        except Exception as e:
            error_logger.error(f"Socket user:join error: {e}", exc_info=True)

    @socketio.on('user:message')
    def on_user_message(data):
        try:
            session_id = data.get('session_id')
            user_id = data.get('user_id')
            text = data.get('text')
            is_first_message = data.get('is_first_message', False)
            app_logger.info(f"Socket user:message for session_id: {session_id}, user_id: {user_id}")
            if session_id and user_id and text:
                result = handle_user_message(session_id, user_id, text, is_first_message=is_first_message)
                emit_stream_chunks(socketio, user_id, session_id, result.get('ai_text_chunks', []), delay=os.getenv('STREAM_DELAY', 0.5))
                emit_response_end(socketio, user_id, session_id, result.get('ai_msg_id'), result.get('ai_text'))
        except Exception as e:
            error_logger.error(f"Socket user:message error: {e}", exc_info=True)
