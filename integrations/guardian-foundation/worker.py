"""Local, read-only Guardian health queue. Python 3.9+, standard library only."""
import argparse
import json
import sqlite3
import time
import urllib.error
import urllib.request
from pathlib import Path
from datetime import datetime, timezone

TARGETS = {
    "streetwise-site": "https://streetwise-connection.vercel.app/",
    "jarvis-health": "https://jarvis-openclaw-production.up.railway.app/healthz",
    "jarvis-ready": "https://jarvis-openclaw-production.up.railway.app/readyz",
}
MAX_ATTEMPTS = 3

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def connect(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(str(path), timeout=10)
    db.row_factory = sqlite3.Row
    db.executescript("""
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY, target TEXT NOT NULL, slot INTEGER NOT NULL,
      state TEXT NOT NULL DEFAULT 'PENDING', attempts INTEGER NOT NULL DEFAULT 0,
      available REAL NOT NULL DEFAULT 0, lease REAL,
      UNIQUE(target,slot)
    );
    CREATE TABLE IF NOT EXISTS evidence (
      id INTEGER PRIMARY KEY, job_id INTEGER NOT NULL, checked_at TEXT NOT NULL,
      target TEXT NOT NULL, status TEXT NOT NULL, http_code INTEGER,
      reason TEXT NOT NULL
    );
    """)
    return db

def seed(db, now):
    with db:
        db.executemany("INSERT OR IGNORE INTO jobs(target,slot) VALUES (?,?)",
                       [(name, int(now//3600)) for name in TARGETS])

def claim(db, now):
    db.execute("BEGIN IMMEDIATE")
    try:
        db.execute("UPDATE jobs SET state='FAILED',lease=NULL WHERE state='RUNNING' AND lease<=? AND attempts>=?", (now,MAX_ATTEMPTS))
        row=db.execute("""SELECT * FROM jobs WHERE attempts<? AND
            ((state='PENDING' AND available<=?) OR (state='RUNNING' AND lease<=?))
            ORDER BY id LIMIT 1""",(MAX_ATTEMPTS,now,now)).fetchone()
        if row:
            db.execute("UPDATE jobs SET state='RUNNING', attempts=attempts+1, lease=? WHERE id=?",(now+120,row["id"]))
        db.commit()
        return row
    except Exception:
        db.rollback()
        raise

def probe(target):
    if target not in TARGETS:
        return "FAILED", None, "target_not_allowed"
    req=urllib.request.Request(TARGETS[target],headers={"User-Agent":"GuardianHealth/1.0"})
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect())
    try:
        with opener.open(req,timeout=10) as response:
            code=response.status
            return ("VERIFIED" if 200<=code<300 else "FAILED"),code,"http_only"
    except urllib.error.HTTPError as exc:
        code=exc.code
        exc.close()
        return "FAILED",code,"http_error"
    except (OSError,urllib.error.URLError):
        return "UNVERIFIED",None,"connection_error"

def finish(db,row,result,now):
    status,code,reason=result
    attempt=row["attempts"]+1
    state="DONE" if status=="VERIFIED" else ("FAILED" if attempt>=MAX_ATTEMPTS else "PENDING")
    with db:
        changed=db.execute("UPDATE jobs SET state=?, available=?, lease=NULL WHERE id=? AND state='RUNNING' AND attempts=?",
                           (state,now+60*attempt,row["id"],attempt)).rowcount
        if changed:
            db.execute("INSERT INTO evidence(job_id,checked_at,target,status,http_code,reason) VALUES (?,?,?,?,?,?)",
                       (row["id"],datetime.fromtimestamp(now,timezone.utc).isoformat(),row["target"],status,code,reason))

def report(db):
    rows=db.execute("""SELECT e.* FROM evidence e WHERE e.id=(SELECT MAX(x.id) FROM evidence x WHERE x.target=e.target) ORDER BY e.target""").fetchall()
    jobs=db.execute("SELECT state,COUNT(*) AS count FROM jobs GROUP BY state").fetchall()
    latest={row["target"]:dict(row) for row in rows}
    return {"checks":[latest.get(name,{"target":name,"status":"UNKNOWN"}) for name in TARGETS],
            "queue":[dict(row) for row in jobs]}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("action",choices=["run","status"])
    parser.add_argument("--db",type=Path,default=Path.home()/".guardian-foundation"/"state.sqlite3")
    args=parser.parse_args()
    with connect(args.db) as db:
        if args.action=="run":
            seed(db,time.time())
            for _ in range(20):
                row=claim(db,time.time())
                if row is None:
                    break
                finish(db,row,probe(row["target"]),time.time())
        print(json.dumps(report(db),indent=2))

if __name__=="__main__":
    main()
