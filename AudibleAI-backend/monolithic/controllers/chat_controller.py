from flask import request, jsonify
from monolithic.services.chat_service import (
    list_sessions, create_new_session, list_messages, handle_user_message
)
from monolithic.utils.jwt_utils import get_jwt_user_id

def get_sessions():
    user_id = get_jwt_user_id(request)
    return jsonify(list_sessions(user_id)), 200

def create_session():
    user_id = get_jwt_user_id(request)
    title = request.json.get('title', 'New Chat')
    session_id = create_new_session(user_id, title)
    return jsonify({'session_id': session_id}), 201

def get_messages(session_id):
    user_id = get_jwt_user_id(request)
    return jsonify(list_messages(session_id, user_id)), 200

def send_message(session_id):
    user_id = get_jwt_user_id(request)
    text = request.json.get('text')
    msg = handle_user_message(session_id, user_id, text)
    return jsonify(msg), 201