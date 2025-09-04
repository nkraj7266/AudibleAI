from components.postgres.postgres_conn_utils import get_db
import logging
from logging_config import app_logger, error_logger

def get_user_by_email_db(email):
    try:
        db = get_db()
        cur = db.cursor()
        app_logger.info(f"DB Query: Fetching user by email: {email}")
        cur.execute("SELECT id, password_hash FROM users WHERE email=%s", (email,))
        return cur.fetchone()
    except Exception as e:
        error_logger.error(f"get_user_by_email_db error: {e}", exc_info=True)
        return None

def user_exists_db(email):
    try:
        db = get_db()
        cur = db.cursor()
        app_logger.info(f"DB Query: Checking if user exists with email: {email}")
        cur.execute("SELECT id FROM users WHERE email=%s", (email,))
        return cur.fetchone() is not None
    except Exception as e:
        error_logger.error(f"user_exists_db error: {e}", exc_info=True)
        return False

def create_user_db(email, password_hash):
    try:
        db = get_db()
        cur = db.cursor()
        app_logger.info(f"DB Query: Creating new user with email: {email}")
        cur.execute("INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id", (email, password_hash))
        user_id = cur.fetchone()[0]
        db.commit()
        app_logger.info(f"DB Query: Successfully created user with ID: {user_id}")
        return user_id
    except Exception as e:
        error_logger.error(f"create_user_db error: {e}", exc_info=True)
        return None

def update_last_login_db(user_id):
    try:
        db = get_db()
        cur = db.cursor()
        app_logger.info(f"DB Query: Updating last login timestamp for user ID: {user_id}")
        cur.execute("UPDATE users SET last_login_at=NOW() WHERE id=%s", (user_id,))
        db.commit()
        app_logger.info(f"DB Query: Successfully updated last login for user ID: {user_id}")
    except Exception as e:
        error_logger.error(f"update_last_login_db error: {e}", exc_info=True)
