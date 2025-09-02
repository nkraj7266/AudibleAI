
from flask import request, jsonify
from monolithic.services.auth_service import register_user, login_user, logout_user
from monolithic.utils.jwt_utils import get_jwt_user_id
import logging
from logging_config import app_logger, error_logger

def register():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        app_logger.info(f"Register attempt for email: {email}")
        result, status = register_user(email, password)
        return jsonify(result), status
    except Exception as e:
        error_logger.error(f"Register error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

def login():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        app_logger.info(f"Login attempt for email: {email}")
        result, status = login_user(email, password)
        return jsonify(result), status
    except Exception as e:
        error_logger.error(f"Login error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

def logout():
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        app_logger.info(f"Logout attempt with token: {token}")
        result, status = logout_user(token)
        return jsonify(result), status
    except Exception as e:
        error_logger.error(f"Logout error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

def verify_jwt():
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_id = get_jwt_user_id(request)
        if not user_id:
            app_logger.warning("user_id not found in token")
            return jsonify({'error': 'user_id not found in token'}), 400
        app_logger.info(f"JWT verified for user_id: {user_id}")
        return jsonify({'user_id': user_id}), 200
    except Exception as e:
        error_logger.error(f"JWT verify error: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500