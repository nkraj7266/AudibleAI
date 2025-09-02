from flask import Blueprint
from monolithic.controllers.chat_controller import (
    get_sessions, create_session, get_messages, send_message,
    delete_session_route, update_session_title_route
)

chat_bp = Blueprint('chat', __name__)

chat_bp.route('/sessions', methods=['GET'])(get_sessions)
chat_bp.route('/sessions', methods=['POST'])(create_session)
chat_bp.route('/sessions/<session_id>', methods=['DELETE'])(delete_session_route)
chat_bp.route('/sessions/<session_id>', methods=['PATCH'])(update_session_title_route)
chat_bp.route('/sessions/<session_id>/messages', methods=['GET'])(get_messages)
chat_bp.route('/sessions/<session_id>/messages', methods=['POST'])(send_message)