from flask import request, jsonify
from monolithic.services.auth_service import register_user, login_user, logout_user
from monolithic.utils.jwt_utils import get_jwt_user_id

def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    result, status = register_user(email, password)
    return jsonify(result), status

def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    result, status = login_user(email, password)
    return jsonify(result), status

def logout():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    result, status = logout_user(token)
    return jsonify(result), status

def verify_jwt():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user_id = get_jwt_user_id(request)
    if not user_id:
        return jsonify({'error': 'user_id not found in token'}), 400
    return jsonify({'user_id': user_id}), 200