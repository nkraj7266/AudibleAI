import os
from flask import Flask
from flask_socketio import SocketIO
from dotenv import load_dotenv
from components.postgres.postgres_conn_utils import init_db
from monolithic.utils.routes.auth_routes import auth_bp
from monolithic.utils.routes.chat_routes import chat_bp

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET')
app.config['DATABASE_URL'] = os.getenv('DATABASE_URL')

# Initialize DB
init_db(app)

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(chat_bp, url_prefix='/chat')

# SocketIO setup
socketio = SocketIO(app, cors_allowed_origins="*")

# Pass socketio to services as needed, for example:
# from monolithic.utils.services.my_service import set_socketio
# set_socketio(socketio)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)