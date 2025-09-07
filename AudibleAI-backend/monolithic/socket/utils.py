import base64
from logging_config import app_logger, error_logger
from components.tts.google_chirp import generate_tts_audio

def stream_sentences_with_audio(socketio, user_id, session_id, message_id, markdown_text, sentences):
    """
    Streams markdown content and sentences with immediate TTS generation for each.
    Implements dual-track approach: full markdown for rendering + plain sentences for audio sync.
    """
    try:
        user_room = get_user_room(user_id)
        
        # Track 1: Send full markdown content for proper frontend rendering
        socketio.emit('ai:response:content', {
            'session_id': session_id,
            'message_id': message_id,
            'markdown_text': markdown_text,
            'total_sentences': len(sentences)
        }, room=user_room)
        
        # Track 2: Stream plain text sentences for audio synchronization and highlighting
        for i, sentence_text in enumerate(sentences):
            # Emit sentence coordination event (for highlighting sync)
            socketio.emit('ai:sentence:highlight', {
                'session_id': session_id,
                'message_id': message_id,
                'sentence_index': i,
                'plain_text': sentence_text
            }, room=user_room)

            # Generate and stream TTS for the sentence
            try:
                if sentence_text.strip():
                    audio_b64 = generate_tts_audio(sentence_text)
                    audio_bytes = base64.b64decode(audio_b64)
                    
                    # Stream audio in chunks
                    chunk_size = 8192
                    total_chunks = (len(audio_bytes) + chunk_size - 1) // chunk_size
                    
                    for chunk_index in range(total_chunks):
                        chunk = audio_bytes[chunk_index*chunk_size:(chunk_index+1)*chunk_size]
                        chunk_b64 = base64.b64encode(chunk).decode('utf-8')
                        is_last = chunk_index == total_chunks - 1
                        
                        socketio.emit('ai:sentence:audio', {
                            'session_id': session_id,
                            'message_id': message_id,
                            'sentence_index': i,
                            'chunk_seq': chunk_index,
                            'bytes': chunk_b64,
                            'is_last': is_last
                        }, room=user_room)
                    
                    app_logger.debug(f"Streamed TTS for sentence {i} of message {message_id}")

            except Exception as e:
                error_logger.error(f"TTS generation failed for sentence {i} of message {message_id}: {e}")
                socketio.emit('ai:sentence:audio:error', {
                    'session_id': session_id,
                    'message_id': message_id,
                    'sentence_index': i,
                    'error': 'TTS generation failed'
                }, room=user_room)
        
        # Signal that all content and audio have been sent
        socketio.emit('ai:response:complete', {
            'session_id': session_id,
            'message_id': message_id
        }, room=user_room)
        
        app_logger.info(f"Completed sentence streaming for message {message_id}")

    except Exception as e:
        error_logger.error(f"stream_sentences_with_audio error: {e}", exc_info=True)
        socketio.emit('ai:response:error', {
            'session_id': session_id,
            'error': 'Failed to stream response'
        }, room=get_user_room(user_id))

def get_user_room(user_id):
    """
    Returns the standardized room name for a user.
    """
    return str(user_id)
