const path = require("node:path");
const Database = require("better-sqlite3");

const dbPath = path.resolve(__dirname, "./db/contests.db");
const db = new Database(dbPath);

const idsId = require("./config.json").idsId;

db.prepare(`
    CREATE TABLE IF NOT EXISTS contests (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL
    )
`).run();

class UtilityDB {
    constructor(id) { this.id = id; }

    load() {
        const row = db.prepare("SELECT data FROM contests WHERE id = ?").get(this.id);
        return row ? JSON.parse(row.data) : -1;
    }

    save(contest) {
        db.prepare(`
            INSERT INTO contests (id, data) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET data = excluded.data
        `).run(this.id, JSON.stringify(contest));
    }

    setId(ids) {
        const idDB = new UtilityDB(idsId);
        idDB.save(ids);
    }

    getId() {
        const idDB = new UtilityDB(idsId);
        const data = idDB.load();
        return data == -1 ? {} : data;
    }

    delete() {
        db.prepare("DELETE FROM contests WHERE id = ?").run(this.id);
    }

    static all() {
        return db.prepare("SELECT id, data FROM contests").all()
            .map(row => ({ id: row.id, data: JSON.parse(row.data) }));
    }
}

module.exports = UtilityDB;