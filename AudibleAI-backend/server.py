import os
import sys
from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from dotenv import load_dotenv
from components.postgres.postgres_conn_utils import init_db
from monolithic.routes.auth_routes import auth_bp
from monolithic.routes.chat_routes import chat_bp
from monolithic.socket.events import register_socket_events

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET')
app.config['DATABASE_URL'] = os.getenv('DATABASE_URL')

# Initialize DB
init_db(app)

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(chat_bp)

# SocketIO setup
socketio = SocketIO(app, cors_allowed_origins="*")
sys.modules['server_socketio'] = socketio # Make socketio available for services

# Register socket events
register_socket_events(socketio)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=os.getenv('PORT', 5000))