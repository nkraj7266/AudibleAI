import logging
import os

# Ensure log directory exists
LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

APP_LOG_PATH = os.path.join(LOG_DIR, 'app.log')
ERROR_LOG_PATH = os.path.join(LOG_DIR, 'error.log')

# Log format includes file name
LOG_FORMAT = '%(asctime)s %(levelname)s %(name)s [%(filename)s]: %(message)s'

# App logger (all logs)
app_logger = logging.getLogger('app_logger')
app_logger.setLevel(logging.INFO)
app_handler = logging.FileHandler(APP_LOG_PATH)
app_handler.setFormatter(logging.Formatter(LOG_FORMAT))
if not app_logger.hasHandlers():
    app_logger.addHandler(app_handler)

# Error logger (errors only)
error_logger = logging.getLogger('error_logger')
error_logger.setLevel(logging.ERROR)
error_handler = logging.FileHandler(ERROR_LOG_PATH)
error_handler.setFormatter(logging.Formatter(LOG_FORMAT))
if not error_logger.hasHandlers():
    error_logger.addHandler(error_handler)
