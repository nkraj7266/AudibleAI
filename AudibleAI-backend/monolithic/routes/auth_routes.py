from flask import Blueprint
from monolithic.controllers.auth_controller import register, login, logout, verify_jwt

auth_bp = Blueprint('auth', __name__)

auth_bp.route('/register', methods=['POST'])(register)
auth_bp.route('/login', methods=['POST'])(login)
auth_bp.route('/logout', methods=['POST'])(logout)
auth_bp.route('/verify', methods=['GET'])(verify_jwt)