import os
import sys
from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from dotenv import load_dotenv
from components.postgres.postgres_conn_utils import init_db
from monolithic.routes.auth_routes import auth_bp
from monolithic.routes.chat_routes import chat_bp

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

# Make socketio available for services
sys.modules['server_socketio'] = socketio

# SocketIO event: join room
@socketio.on('join')
def on_join(data):
    user_id = data.get('user_id')
    if user_id:
        from flask_socketio import join_room
        join_room(str(user_id))

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)