import os
import base64
import logging
from flask_socketio import join_room
from monolithic.services.chat_service import handle_user_message
from monolithic.socket.utils import emit_stream_chunks, emit_response_end, get_user_room
from logging_config import app_logger, error_logger
from components.tts.google_chirp import generate_tts_audio

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

    @socketio.on('tts:start')
    def on_tts_start(data):
        try:
            message_id = data.get('messageId')
            text = data.get('text')
            voice = data.get('voice')
            speaking_rate = data.get('speakingRate')
            pitch = data.get('pitch')
            user_id = data.get('userId')
            app_logger.info(f"Socket tts:start for message_id: {message_id}, user_id: {user_id}")
            # Call TTS API
            audio_b64 = generate_tts_audio(text, voice, speaking_rate, pitch)
            # Stream audio chunks (simulate chunking for demo)
            audio_bytes = base64.b64decode(audio_b64)
            chunk_size = 4096
            total_chunks = (len(audio_bytes) + chunk_size - 1) // chunk_size
            for i in range(total_chunks):
                chunk = audio_bytes[i*chunk_size:(i+1)*chunk_size]
                socketio.emit('tts:audio', {
                    'messageId': message_id,
                    'chunkSeq': i,
                    'bytes': base64.b64encode(chunk).decode('utf-8'),
                    'isLast': i == total_chunks - 1
                }, room=get_user_room(user_id))
            # Simulate sentence progress (for highlighting)
            # In production, use NLP to split sentences and emit progress
            socketio.emit('tts:progress', {
                'messageId': message_id,
                'sentenceIndex': 0
            }, room=get_user_room(user_id))
            socketio.emit('tts:ready', {'messageId': message_id}, room=get_user_room(user_id))
        except Exception as e:
            error_logger.error(f"Socket tts:start error: {e}", exc_info=True)
            socketio.emit('tts:error', {
                'messageId': data.get('messageId'),
                'code': 'TTS_ERROR',
                'message': str(e)
            }, room=get_user_room(data.get('userId')))

    @socketio.on('tts:stop')
    def on_tts_stop(data):
        try:
            message_id = data.get('messageId')
            user_id = data.get('userId')
            app_logger.info(f"Socket tts:stop for message_id: {message_id}, user_id: {user_id}")
            socketio.emit('tts:stopped', {
                'messageId': message_id,
                'reason': 'Stopped by user'
            }, room=get_user_room(user_id))
        except Exception as e:
            error_logger.error(f"Socket tts:stop error: {e}", exc_info=True)
