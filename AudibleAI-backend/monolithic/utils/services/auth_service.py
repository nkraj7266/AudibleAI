import datetime
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from flask import current_app
from components.postgres.postgres_conn_utils import get_db

def register_user(email, password):
    if not email or not password:
        return {'error': 'Missing email or password'}, 400
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id FROM users WHERE email=%s", (email,))
    if cur.fetchone():
        return {'error': 'Email already registered'}, 409
    password_hash = generate_password_hash(password)
    cur.execute("INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id", (email, password_hash))
    user_id = cur.fetchone()[0]
    db.commit()
    # Immediately log in the user after registration
    token = jwt.encode({
        'user_id': user_id,
        'exp': (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)).timestamp()
    }, current_app.config['SECRET_KEY'], algorithm='HS256')
    cur.execute("UPDATE users SET last_login_at=NOW() WHERE id=%s", (user_id,))
    db.commit()
    return {'message': 'User registered and logged in successfully', 'token': token, 'user_id': user_id}, 201

def login_user(email, password):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id, password_hash FROM users WHERE email=%s", (email,))
    user = cur.fetchone()
    if not user or not check_password_hash(user[1], password):
        return {'error': 'Invalid credentials'}, 401
    token = jwt.encode({
        'user_id': user[0],
        'exp': (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)).timestamp()
    }, current_app.config['SECRET_KEY'], algorithm='HS256')
    cur.execute("UPDATE users SET last_login_at=NOW() WHERE id=%s", (user[0],))
    db.commit()
    return {'token': token}, 200