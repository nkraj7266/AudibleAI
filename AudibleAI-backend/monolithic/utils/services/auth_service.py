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

def register_user(email, password):
    if not email or not password:
        return {'error': 'Missing email or password'}, 400
    if user_exists_db(email):
        return {'error': 'Email already registered'}, 409
    password_hash = generate_password_hash(password)
    user_id = create_user_db(email, password_hash)
    token = jwt.encode({
        'user_id': user_id,
        'exp': (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)).timestamp()
    }, current_app.config['SECRET_KEY'], algorithm='HS256')
    update_last_login_db(user_id)
    return {'message': 'User registered and logged in successfully', 'token': token, 'user_id': user_id}, 201

def login_user(email, password):
    user = get_user_by_email_db(email)
    if not user or not check_password_hash(user[1], password):
        return {'error': 'Invalid credentials'}, 401
    token = jwt.encode({
        'user_id': user[0],
        'exp': (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)).timestamp()
    }, current_app.config['SECRET_KEY'], algorithm='HS256')
    update_last_login_db(user[0])
    return {'token': token}, 200

def get_jwt_user_id(request):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except Exception:
        return None

def logout_user(token):
    # JWT is stateless; client should delete token
    return {'message': 'Logged out'}, 200