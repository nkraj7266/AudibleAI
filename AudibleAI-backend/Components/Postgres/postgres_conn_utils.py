import psycopg2
from flask import g, current_app
import logging
from logging_config import app_logger, error_logger

def get_db():
    try:
        if 'db' not in g:
            g.db = psycopg2.connect(current_app.config['DATABASE_URL'])
        return g.db
    except Exception as e:
        error_logger.error(f"get_db error: {e}", exc_info=True)
        raise

def close_db(e=None):
    try:
        db = g.pop('db', None)
        if db is not None:
            db.close()
    except Exception as e:
        error_logger.error(f"close_db error: {e}", exc_info=True)

def init_db(app):
    try:
        app.teardown_appcontext(close_db)
        app_logger.info("Database teardown registered.")
    except Exception as e:
        error_logger.error(f"init_db error: {e}", exc_info=True)