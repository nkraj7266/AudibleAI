import os
import base64
import logging
from flask_socketio import join_room
from monolithic.services.chat_service import handle_user_message
from monolithic.socket.utils import (
    emit_stream_chunks, emit_response_end, 
    get_user_room, stream_tts_audio
)
from monolithic.utils.text_processing import clean_markdown_for_tts
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
                
                # Stream text response chunks
                emit_stream_chunks(socketio, user_id, session_id, result.get('ai_text_chunks', []), delay=float(os.getenv('STREAM_DELAY', 0.5)))
                app_logger.info(f"Delay used: {os.getenv('STREAM_DELAY', 0.5)}")
                
                # Send complete response and trigger auto TTS
                ai_msg_id = result.get('ai_msg_id')
                ai_text = result.get('ai_text')
                emit_response_end(socketio, user_id, session_id, ai_msg_id, ai_text)
                
                # Generate and stream TTS audio with auto-play flag
                stream_tts_audio(socketio, user_id, ai_msg_id, ai_text, auto_play=True)
        except Exception as e:
            error_logger.error(f"Socket user:message error: {e}", exc_info=True)

    @socketio.on('tts:start')
    def on_tts_start(data):
        try:
            # Extract all required data first
            message_id = data.get('messageId')
            text = data.get('text')
            user_id = data.get('userId')
            
            # Validate required fields
            if not all([message_id, text, user_id]):
                raise ValueError("Missing required fields: messageId, text, or userId")

            # Optional TTS settings
            voice = data.get('voice')
            speaking_rate = data.get('speakingRate')
            pitch = data.get('pitch')

            app_logger.info(f"Socket tts:start for message_id: {message_id}, user_id: {user_id}")

            # Clean markdown and prepare text for TTS
            clean_text = clean_markdown_for_tts(text)
            app_logger.debug(f"Original text: {text[:30]}...")
            app_logger.debug(f"Cleaned text for TTS: {clean_text[:30]}...")
            
            # Generate audio from cleaned text
            audio_b64 = generate_tts_audio(clean_text, voice, speaking_rate, pitch)
            audio_bytes = base64.b64decode(audio_b64)

            # Stream audio in chunks
            chunk_size = 8192  # Increased chunk size for better performance
            total_chunks = (len(audio_bytes) + chunk_size - 1) // chunk_size

            # Send audio chunks
            user_room = get_user_room(user_id)
            for i in range(total_chunks):
                chunk = audio_bytes[i*chunk_size:(i+1)*chunk_size]
                chunk_b64 = base64.b64encode(chunk).decode('utf-8')
                is_last = i == total_chunks - 1

                # Emit chunk
                socketio.emit('tts:audio', {
                    'messageId': message_id,
                    'chunkSeq': i,
                    'bytes': chunk_b64,
                    'isLast': is_last
                }, room=user_room)

                # If this is the last chunk, let client know processing is complete
                if is_last:
                    socketio.emit('tts:ready', {
                        'messageId': message_id,
                        'duration': None  # Could add audio duration if needed
                    }, room=user_room)

        except ValueError as e:
            # Handle validation errors
            error_logger.warning(f"Socket tts:start validation error: {e}")
            socketio.emit('tts:error', {
                'messageId': data.get('messageId'),
                'code': 'VALIDATION_ERROR',
                'message': str(e)
            }, room=get_user_room(data.get('userId')))
        except Exception as e:
            # Handle other errors
            error_logger.error(f"Socket tts:start error: {e}", exc_info=True)
            socketio.emit('tts:error', {
                'messageId': data.get('messageId'),
                'code': 'TTS_ERROR',
                'message': 'Failed to generate audio'
            }, room=get_user_room(data.get('userId')))

    @socketio.on('tts:stop')
    def on_tts_stop(data):
        try:
            # Extract and validate required fields
            message_id = data.get('messageId')
            user_id = data.get('userId')
            
            if not all([message_id, user_id]):
                raise ValueError("Missing required fields: messageId or userId")
                
            app_logger.info(f"Socket tts:stop for message_id: {message_id}, user_id: {user_id}")
            
            # Get user room once
            user_room = get_user_room(user_id)
            
            # Notify client that playback has been stopped
            socketio.emit('tts:stopped', {
                'messageId': message_id,
                'reason': 'Stopped by user'
            }, room=user_room)
            
        except ValueError as e:
            error_logger.warning(f"Socket tts:stop validation error: {e}")
        except Exception as e:
            error_logger.error(f"Socket tts:stop error: {e}", exc_info=True)
