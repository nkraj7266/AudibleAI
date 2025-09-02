from flask import request, jsonify
from monolithic.services.chat_service import (
    list_sessions, create_new_session, list_messages, handle_user_message,
    delete_session, update_session_title
)
from monolithic.utils.jwt_utils import get_jwt_user_id
import logging
from logging_config import app_logger, error_logger

def get_sessions():
    try:
        user_id = get_jwt_user_id(request)
        app_logger.info(f"Get sessions for user_id: {user_id}")
        return jsonify(list_sessions(user_id)), 200
    except Exception as e:
        error_logger.error(f"Get sessions error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

def create_session():
    try:
        user_id = get_jwt_user_id(request)
        title = request.json.get('title', 'New Chat')
        app_logger.info(f"Create session for user_id: {user_id}, title: {title}")
        session_id = create_new_session(user_id, title)
        return jsonify({'session_id': session_id}), 201
    except Exception as e:
        error_logger.error(f"Create session error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

def get_messages(session_id):
    try:
        user_id = get_jwt_user_id(request)
        app_logger.info(f"Get messages for session_id: {session_id}, user_id: {user_id}")
        return jsonify(list_messages(session_id, user_id)), 200
    except Exception as e:
        error_logger.error(f"Get messages error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

def send_message(session_id):
    try:
        user_id = get_jwt_user_id(request)
        text = request.json.get('text')
        app_logger.info(f"Send message for session_id: {session_id}, user_id: {user_id}")
        msg = handle_user_message(session_id, user_id, text)
        return jsonify(msg), 201
    except Exception as e:
        error_logger.error(f"Send message error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

def delete_session_route(session_id):
    try:
        user_id = get_jwt_user_id(request)
        app_logger.info(f"Delete session {session_id} for user_id: {user_id}")
        success = delete_session(session_id, user_id)
        if success:
            return jsonify({'message': 'Session deleted'}), 200
        else:
            return jsonify({'error': 'Session not found or not authorized'}), 404
    except Exception as e:
        error_logger.error(f"Delete session error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

def update_session_title_route(session_id):
    try:
        user_id = get_jwt_user_id(request)
        new_title = request.json.get('title')
        if not new_title:
            app_logger.warning("Missing title for session title update")
            return jsonify({'error': 'Missing title'}), 400
        app_logger.info(f"Update session title for session_id: {session_id}, user_id: {user_id}, new_title: {new_title}")
        success = update_session_title(session_id, user_id, new_title)
        if success:
            return jsonify({'message': 'Session title updated'}), 200
        else:
            return jsonify({'error': 'Session not found or not authorized'}), 404
    except Exception as e:
        error_logger.error(f"Update session title error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500