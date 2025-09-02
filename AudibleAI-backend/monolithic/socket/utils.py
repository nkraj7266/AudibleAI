import time

def emit_stream_chunks(socketio, user_id, session_id, chunks, delay=0.5):
    """
    Emits AI response chunks to the user room with a delay for readable streaming.
    """
    room = get_user_room(user_id)
    for chunk in chunks:
        socketio.emit('ai:response:chunk', {
            'session_id': session_id,
            'chunk': chunk
        }, room=room)
        time.sleep(delay)

def get_user_room(user_id):
    """
    Returns the standardized room name for a user.
    """
    return str(user_id)

def emit_response_end(socketio, user_id, session_id, ai_msg_id, ai_text):
    """
    Emits the final AI response message to the user room.
    """
    room = get_user_room(user_id)
    socketio.emit('ai:response:end', {
        'session_id': session_id,
        'message': {
            'id': ai_msg_id,
            'sender': 'AI',
            'text': ai_text
        }
    }, room=room)
