from flask import current_app, jsonify
import jwt
import logging
from logging_config import app_logger, error_logger

def get_jwt_user_id(request):
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            app_logger.warning("Missing token in get_jwt_user_id")
            return jsonify({'error': 'Missing token'}), 400
        if not is_jwt_valid(token):
            app_logger.warning("Invalid token in get_jwt_user_id")
            return jsonify({'error': 'Invalid token'}), 401
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        app_logger.info(f"JWT decoded for user_id: {payload.get('user_id')}")
        return payload['user_id']
    except Exception as e:
        error_logger.error(f"get_jwt_user_id error: {e}", exc_info=True)
        return None

def is_jwt_valid(token):
    """
    Checks if a JWT token is valid and not expired.
    Returns True if valid, False otherwise.
    """
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        return True
    except Exception as e:
        error_logger.error(f"is_jwt_valid error: {e}", exc_info=True)
        return False