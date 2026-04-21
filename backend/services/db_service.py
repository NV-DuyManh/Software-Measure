"""
backend/services/db_service.py
Thin wrapper around PyMySQL — connection pool via a simple factory.
DO NOT import anything from existing services here.
"""
import logging
import pymysql
import pymysql.cursors
from config import Config

logger = logging.getLogger(__name__)


def get_connection():
    """Return a new PyMySQL connection using credentials from Config."""
    return pymysql.connect(
        host=Config.DB_HOST,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


# ─── Users ────────────────────────────────────────────────────────

def create_user(username: str, email: str, hashed_password: str) -> int:
    """Insert a new user row. Returns the new user id."""
    sql = "INSERT INTO users (username, email, password) VALUES (%s, %s, %s)"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (username, email, hashed_password))
        conn.commit()
        return conn.insert_id()


def find_user_by_username(username: str) -> dict | None:
    sql = "SELECT * FROM users WHERE username = %s LIMIT 1"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (username,))
            return cur.fetchone()


def find_user_by_email(email: str) -> dict | None:
    sql = "SELECT * FROM users WHERE email = %s LIMIT 1"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (email,))
            return cur.fetchone()


def find_user_by_id(user_id: int) -> dict | None:
    sql = "SELECT id, username, email, created_at FROM users WHERE id = %s LIMIT 1"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_id,))
            return cur.fetchone()


# ─── FP History ───────────────────────────────────────────────────

def save_fp_history(user_id: int, result: dict) -> int:
    """
    Persist an FP analysis result for the given user.
    `result` is the dict returned by calculate_fp() plus filename / chunks.
    Returns the new row id.
    """
    sql = """
        INSERT INTO fp_history
            (user_id, filename, ei, eo, eq, ilf, eif,
             ufc, vaf, fp, effort, time_months, cost,
             chunks_processed, chunks_failed)
        VALUES
            (%s, %s, %s, %s, %s, %s, %s,
             %s, %s, %s, %s, %s, %s,
             %s, %s)
    """
    counts = result.get("counts", {})
    params = (
        user_id,
        result.get("filename", ""),
        counts.get("EI", 0),
        counts.get("EO", 0),
        counts.get("EQ", 0),
        counts.get("ILF", 0),
        counts.get("EIF", 0),
        result.get("ufc", 0),
        result.get("vaf", 1.0),
        result.get("fp", 0),
        result.get("effort", 0),
        result.get("time", 0),
        result.get("cost", 0),
        result.get("chunks_processed", 0),
        result.get("chunks_failed", 0),
    )
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
        conn.commit()
        return conn.insert_id()


def get_fp_history_by_user(user_id: int) -> list[dict]:
    """Return all FP history rows for a user, newest first."""
    sql = """
        SELECT id, filename, ei, eo, eq, ilf, eif,
               ufc, vaf, fp, effort, time_months, cost,
               chunks_processed, chunks_failed, analyzed_at
        FROM fp_history
        WHERE user_id = %s
        ORDER BY analyzed_at DESC
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (user_id,))
            rows = cur.fetchall()
    # Convert datetime objects to ISO strings for JSON serialisation
    for row in rows:
        if row.get("analyzed_at"):
            row["analyzed_at"] = row["analyzed_at"].isoformat()
    return rows


# ─── Products ─────────────────────────────────────────────────────

def save_products(products: list[dict]) -> None:
    """Bulk-insert scraped products. Each item must have 'name' and 'price'."""
    if not products:
        return
    sql = "INSERT INTO products (name, price) VALUES (%s, %s)"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.executemany(sql, [(p["name"], p["price"]) for p in products])
        conn.commit()


def get_all_products() -> list[dict]:
    sql = "SELECT id, name, price, scraped_at FROM products ORDER BY scraped_at DESC"
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()
    for row in rows:
        if row.get("scraped_at"):
            row["scraped_at"] = row["scraped_at"].isoformat()
    return rows
