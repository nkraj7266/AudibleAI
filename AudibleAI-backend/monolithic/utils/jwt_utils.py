from flask import current_app
import jwt

def get_jwt_user_id(request):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
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