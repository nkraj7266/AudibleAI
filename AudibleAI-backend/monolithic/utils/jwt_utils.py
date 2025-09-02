from flask import current_app, jsonify
import jwt

def get_jwt_user_id(request):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return jsonify({'error': 'Missing token'}), 400
    if not is_jwt_valid(token):
        return jsonify({'error': 'Invalid token'}), 401
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except Exception:
        return None

def is_jwt_valid(token):
    """
    Checks if a JWT token is valid and not expired.
    Returns True if valid, False otherwise.
    """
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        return True
    except Exception:
        return False