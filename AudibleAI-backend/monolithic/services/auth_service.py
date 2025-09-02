import datetime
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from flask import current_app, request
from components.postgres.auth_queries import (
    get_user_by_email_db,
    user_exists_db,
    create_user_db,
    update_last_login_db
)
import logging
from logging_config import app_logger, error_logger

def register_user(email, password):
    try:
        if not email or not password:
            app_logger.warning("Missing email or password in register_user")
            return {'error': 'Missing email or password'}, 400
        if user_exists_db(email):
            app_logger.warning(f"Email already registered: {email}")
            return {'error': 'Email already registered'}, 409
        password_hash = generate_password_hash(password)
        user_id = create_user_db(email, password_hash)
        token = jwt.encode({
            'user_id': user_id,
            'exp': (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)).timestamp()
        }, current_app.config['SECRET_KEY'], algorithm='HS256')
        update_last_login_db(user_id)
        app_logger.info(f"User registered: {email}, user_id: {user_id}")
        return {'message': 'User registered and logged in successfully', 'token': token, 'user_id': user_id}, 201
    except Exception as e:
        error_logger.error(f"register_user error: {e}", exc_info=True)
        return {'error': str(e)}, 500

def login_user(email, password):
    try:
        user = get_user_by_email_db(email)
        if not user or not check_password_hash(user[1], password):
            app_logger.warning(f"Invalid login credentials for email: {email}")
            return {'error': 'Invalid credentials'}, 401
        token = jwt.encode({
            'user_id': user[0],
            'exp': (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)).timestamp()
        }, current_app.config['SECRET_KEY'], algorithm='HS256')
        update_last_login_db(user[0])
        app_logger.info(f"User logged in: {email}, user_id: {user[0]}")
        return {'token': token}, 200
    except Exception as e:
        error_logger.error(f"login_user error: {e}", exc_info=True)
        return {'error': str(e)}, 500

def logout_user(token):
    try:
        app_logger.info(f"Logout called for token: {token}")
        # JWT is stateless; client should delete token
        return {'message': 'Logged out'}, 200
    except Exception as e:
        error_logger.error(f"logout_user error: {e}", exc_info=True)
        return {'error': str(e)}, 500