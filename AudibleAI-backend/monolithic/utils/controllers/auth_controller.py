from flask import request, jsonify
from monolithic.utils.services.auth_service import register_user, login_user, logout_user

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