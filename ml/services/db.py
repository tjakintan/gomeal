import os
import time
from dotenv import load_dotenv

import psycopg2
from psycopg2.pool import SimpleConnectionPool
from psycopg2.extras import RealDictCursor

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")
DB_PORT = int(os.getenv("DB_PORT", 5432))

db_pool = SimpleConnectionPool(
    minconn=1,
    maxconn=5,
    host=DB_HOST,
    user=DB_USER,
    password=DB_PASSWORD,
    database=DB_NAME,
    port=DB_PORT,
    sslmode="require",
)

def get_conn():
    return db_pool.getconn()

def release_conn(conn, close=False):
    db_pool.putconn(conn, close=close)

def query(sql: str, params=None, retries=2):
    last_err = None

    for attempt in range(retries + 1):
        conn = get_conn()
        close_conn = False

        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(sql, params or [])

                if cur.description:
                    result = cur.fetchall()
                else:
                    result = None

                conn.commit()
                return result

        except psycopg2.OperationalError as err:
            last_err = err
            close_conn = True

            try:
                conn.rollback()
            except Exception:
                pass

            print(f"[db_operational_error] attempt={attempt + 1}/{retries + 1} err={err}")

            if attempt >= retries:
                raise

            time.sleep(0.25 * (attempt + 1))

        except Exception:
            try:
                conn.rollback()
            except Exception:
                close_conn = True

            raise

        finally:
            release_conn(conn, close=close_conn)

    raise last_err
