import time
import base64
import logging
from logging_config import app_logger, error_logger
from monolithic.utils.text_processing import clean_markdown_for_tts
from components.tts.google_chirp import generate_tts_audio

def stream_tts_audio(socketio, user_id, message_id, text, auto_play=False):
    """
    Generate and stream TTS audio for the given text
    auto_play: If True, indicates this is auto-generated TTS that should play automatically
    """
    try:
        user_room = get_user_room(user_id)
        
        # Clean text for TTS
        clean_text = clean_markdown_for_tts(text)
        app_logger.debug(f"Auto TTS: Cleaned text for message {message_id}")
        
        # Generate audio
        audio_b64 = generate_tts_audio(clean_text)
        audio_bytes = base64.b64decode(audio_b64)
        
        # Stream in chunks
        chunk_size = 8192
        total_chunks = (len(audio_bytes) + chunk_size - 1) // chunk_size
        
        for i in range(total_chunks):
            chunk = audio_bytes[i*chunk_size:(i+1)*chunk_size]
            chunk_b64 = base64.b64encode(chunk).decode('utf-8')
            is_last = i == total_chunks - 1
            
            socketio.emit('tts:audio', {
                'messageId': message_id,
                'chunkSeq': i,
                'bytes': chunk_b64,
                'isLast': is_last,
                'autoPlay': auto_play
            }, room=user_room)
            
            if is_last:
                socketio.emit('tts:ready', {
                    'messageId': message_id,
                    'autoPlay': auto_play
                }, room=user_room)
                app_logger.info(f"Auto TTS: Completed streaming audio for message {message_id}")
                
    except Exception as e:
        error_logger.error(f"stream_tts_audio error: {e}", exc_info=True)
        socketio.emit('tts:error', {
            'messageId': message_id,
            'code': 'AUTO_TTS_ERROR',
            'message': 'Failed to generate audio'
        }, room=get_user_room(user_id))

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
            socketio.sleep(delay)
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
