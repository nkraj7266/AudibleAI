from flask_socketio import join_room
from monolithic.services.chat_service import handle_user_message
from monolithic.socket.utils import get_user_room, stream_sentences_with_audio
from monolithic.utils.text_processing import clean_markdown_for_tts, split_text_into_sentences
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
            
            if not all([session_id, user_id, text]):
                raise ValueError("Missing session_id, user_id, or text")

            # 1. Handle user message and get the full AI response
            result = handle_user_message(session_id, user_id, text, is_first_message)
            
            if 'error' in result:
                raise Exception(result['error'])

            ai_msg_id = result['ai_msg_id']
            ai_text_markdown = result['ai_text_markdown']

            # 2. Convert markdown to plain text for TTS and sentence splitting
            plain_text = clean_markdown_for_tts(ai_text_markdown)

            # 3. Split the plain text into sentences
            sentences = split_text_into_sentences(plain_text)
            
            # 4. Stream both markdown content and sentences with audio (dual-track approach)
            stream_sentences_with_audio(socketio, user_id, session_id, ai_msg_id, ai_text_markdown, sentences)

            app_logger.info(f"Completed processing message for session_id: {session_id}, user_id: {user_id}")

        except Exception as e:
            error_logger.error(f"Socket user:message error: {e}", exc_info=True)
            socketio.emit('ai:response:error', {
                'session_id': data.get('session_id'),
                'error': 'Failed to process message'
            }, room=get_user_room(data.get('user_id')))

    @socketio.on('tts:ai:message')
    def on_tts_ai(data):
        try:
            user_id = data.get('user_id')
            session_id = data.get('session_id')
            message_id = data.get('message_id')
            markdown_text = data.get('text')  # This should be the markdown text from frontend
            app_logger.info(f"Socket tts:ai:message for session_id: {session_id}, user_id: {user_id}")

            if not all([session_id, user_id, markdown_text, message_id]):
                raise ValueError("Missing session_id, user_id, text, or message_id")

            # Convert markdown to plain text for TTS and sentence splitting
            plain_text = clean_markdown_for_tts(markdown_text)

            # Split the plain text into sentences
            sentences = split_text_into_sentences(plain_text)

            # Stream both markdown content and sentences with audio (dual-track approach)
            stream_sentences_with_audio(socketio, user_id, session_id, message_id, markdown_text, sentences)

            app_logger.info(f"Completed TTS processing for message_id: {message_id}, session_id: {session_id}, user_id: {user_id}")

        except Exception as e:
            error_logger.error(f"Socket tts:ai:message error: {e}", exc_info=True)
            socketio.emit('ai:response:error', {
                'session_id': data.get('session_id'),
                'error': 'Failed to process TTS'
            }, room=get_user_room(data.get('user_id')))
