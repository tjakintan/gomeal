import time
import threading
from routes.feed.trending.trend import _post_trends

def _start_trend_score_refresh_job(interval_seconds: int = 900):
    """
    Refreshes trend scores every `interval_seconds` (default 15 min)
    so the notification job always has fresh data to read.
    Uses a dummy system user sub that has no seen history and no real embedding,
    so it scores purely on action counts + recency decay.
    """
    SYSTEM_USER_SUB = "system"

    def _run():
        time.sleep(60)
        while True:
            try:
                print("[trend_refresh_job] => started")
                _post_trends(
                    user_sub=SYSTEM_USER_SUB,
                    limit=50,           # score top 50, notif only uses top 10
                    mark_seen=False,    # never mark seen for system user
                )
                print("[trend_refresh_job] => finished")
            except Exception as e:
                print(f"[trend_refresh_job] => error: {e}")
            time.sleep(interval_seconds)

    t = threading.Thread(target=_run, daemon=True)
    t.start()