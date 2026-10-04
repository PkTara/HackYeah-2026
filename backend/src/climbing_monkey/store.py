import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path


class Store:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS climbers (
                id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, data TEXT NOT NULL
            )""")
            db.execute("""CREATE TABLE IF NOT EXISTS records (
                id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES climbers(id) ON DELETE CASCADE,
                kind TEXT NOT NULL, data TEXT NOT NULL
            )""")
            db.execute("""CREATE TABLE IF NOT EXISTS quests (
                id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES climbers(id) ON DELETE CASCADE,
                data TEXT NOT NULL
            )""")
            db.execute("""CREATE TABLE IF NOT EXISTS photos (
                id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES climbers(id) ON DELETE CASCADE,
                metadata TEXT NOT NULL, content BLOB NOT NULL
            )""")

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys = ON")
        try:
            with db:
                yield db
        finally:
            db.close()

    def create_climber(self, user, token_hash):
        with self.connect() as db:
            db.execute(
                "INSERT INTO climbers VALUES (?, ?, ?)", (user["id"], token_hash, json.dumps(user))
            )

    def authenticate(self, token_hash):
        with self.connect() as db:
            row = db.execute(
                "SELECT data FROM climbers WHERE token_hash = ?", (token_hash,)
            ).fetchone()
            return json.loads(row["data"]) if row else None

    def climber(self, owner):
        with self.connect() as db:
            row = db.execute("SELECT data FROM climbers WHERE id = ?", (owner,)).fetchone()
        return json.loads(row["data"]) if row else None

    def update_climber(self, user):
        with self.connect() as db:
            db.execute("UPDATE climbers SET data = ? WHERE id = ?", (json.dumps(user), user["id"]))
        return user

    def delete_climber(self, owner):
        with self.connect() as db:
            db.execute("DELETE FROM climbers WHERE id = ?", (owner,))

    def add_record(self, owner, kind, record):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            if kind == "hands" and record.get("photo_id"):
                row = db.execute(
                    "SELECT metadata FROM photos WHERE id = ? AND owner = ?",
                    (record["photo_id"], owner),
                ).fetchone()
                if row is None:
                    raise KeyError("Photo not found")
                if json.loads(row["metadata"])["side"] != record["side"]:
                    raise ValueError("Photo side does not match the hand observation")
            db.execute(
                "INSERT INTO records VALUES (?, ?, ?, ?)",
                (record["id"], owner, kind, json.dumps(record)),
            )
        return record

    def records(self, owner, kind):
        with self.connect() as db:
            rows = db.execute(
                "SELECT data FROM records WHERE owner = ? AND kind = ?", (owner, kind)
            ).fetchall()
        return sorted(
            (json.loads(row["data"]) for row in rows),
            key=lambda record: datetime.fromisoformat(record["occurred_at"]),
        )

    def delete_record(self, owner, kind, record_id):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            deleted = (
                db.execute(
                    "DELETE FROM records WHERE id = ? AND owner = ? AND kind = ?",
                    (record_id, owner, kind),
                ).rowcount
                > 0
            )
            if deleted:
                # Redact linked evidence in every persisted decision snapshot, including
                # reviewed assessments, within the same deletion transaction.
                for table in ("quests", "records"):
                    rows = db.execute(
                        f"SELECT data FROM {table} WHERE owner = ?", (owner,)
                    ).fetchall()
                    for row in rows:
                        record = json.loads(row["data"])
                        decision = record.get("decision")
                        if not decision:
                            continue
                        entries = decision.get("evidence", [])
                        if any(entry["id"] == record_id for entry in entries):
                            decision["evidence"] = [
                                {
                                    "id": record_id,
                                    "label": "Record removed",
                                    "detail": "Provenance unavailable after deletion.",
                                }
                                if entry["id"] == record_id
                                else entry
                                for entry in entries
                            ]
                            db.execute(
                                f"UPDATE {table} SET data = ? WHERE id = ? AND owner = ?",
                                (json.dumps(record), record["id"], owner),
                            )
            return deleted

    def quests(self, owner):
        with self.connect() as db:
            rows = db.execute(
                "SELECT data FROM quests WHERE owner = ? ORDER BY rowid", (owner,)
            ).fetchall()
        return [json.loads(row["data"]) for row in rows]

    def assign_quest(self, owner, candidate_factory, eligible):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            rows = db.execute("SELECT data FROM quests WHERE owner = ?", (owner,)).fetchall()
            for row in rows:
                quest = json.loads(row["data"])
                if quest["status"] == "assigned":
                    if eligible(quest):
                        return quest
                    quest["status"] = "paused"
                    db.execute(
                        "UPDATE quests SET data = ? WHERE id = ?", (json.dumps(quest), quest["id"])
                    )
            candidate = candidate_factory()
            db.execute(
                "INSERT INTO quests VALUES (?, ?, ?)",
                (candidate["id"], owner, json.dumps(candidate)),
            )
        return candidate

    def complete_quest(self, owner, quest_id, eligible):
        from datetime import datetime, timezone

        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute(
                "SELECT data FROM quests WHERE id = ? AND owner = ?", (quest_id, owner)
            ).fetchone()
            if row is None:
                raise KeyError(quest_id)
            quest = json.loads(row["data"])
            if quest["status"] != "completed":
                if quest["status"] != "assigned" or not eligible(quest):
                    raise ValueError("Quest is no longer eligible; request a new suggestion")
                quest["status"] = "completed"
                quest["completed_at"] = datetime.now(timezone.utc).isoformat()
                db.execute("UPDATE quests SET data = ? WHERE id = ?", (json.dumps(quest), quest_id))
        return quest

    def pet(self, owner):
        xp = 10 * sum(quest["status"] == "completed" for quest in self.quests(owner))
        return {"xp": xp, "level": 1 + xp // 50, "cosmetic": "canopy" if xp >= 50 else "seedling"}

    def skip_quest(self, owner, quest_id):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute(
                "SELECT data FROM quests WHERE id = ? AND owner = ?", (quest_id, owner)
            ).fetchone()
            if row is None:
                raise KeyError(quest_id)
            quest = json.loads(row["data"])
            if quest["status"] == "completed":
                raise ValueError("Completed quests cannot be skipped")
            quest["status"] = "skipped"
            db.execute("UPDATE quests SET data = ? WHERE id = ?", (json.dumps(quest), quest_id))
        return quest

    def save_photo(self, owner, metadata, content):
        with self.connect() as db:
            db.execute(
                "INSERT INTO photos VALUES (?, ?, ?, ?)",
                (metadata["id"], owner, json.dumps(metadata), content),
            )
        return metadata

    def photos(self, owner):
        with self.connect() as db:
            rows = db.execute(
                "SELECT metadata FROM photos WHERE owner = ? ORDER BY rowid", (owner,)
            ).fetchall()
        return [json.loads(row["metadata"]) for row in rows]

    def photo(self, owner, photo_id):
        with self.connect() as db:
            row = db.execute(
                "SELECT metadata, content FROM photos WHERE id = ? AND owner = ?", (photo_id, owner)
            ).fetchone()
        return (json.loads(row["metadata"]), row["content"]) if row else None

    def delete_photo(self, owner, photo_id):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            deleted = db.execute(
                "DELETE FROM photos WHERE id = ? AND owner = ?", (photo_id, owner)
            ).rowcount
            if not deleted:
                return False
            rows = db.execute(
                "SELECT id, data FROM records WHERE owner = ? AND kind = 'hands'", (owner,)
            ).fetchall()
            for row in rows:
                record = json.loads(row["data"])
                if record.get("photo_id") == photo_id:
                    record["photo_id"] = None
                    db.execute(
                        "UPDATE records SET data = ? WHERE id = ?", (json.dumps(record), row["id"])
                    )
        return True
