const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./users.db");

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER,
    username TEXT,
    name TEXT,
    phone TEXT,
    role TEXT
  )`);
});

function saveUser({ telegram_id, username, name, phone, role }) {
    db.run(
        `INSERT INTO users (telegram_id, username, name, phone, role) VALUES (?, ?, ?, ?, ?)`,
        [telegram_id.toString(), username, name, phone, role]
    );
}


function getAllUsers() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM users ORDER BY id DESC", [], (err, rows) => {
            if (err) {
                console.error(err);
                resolve([]); // або reject(err), якщо хочеш зупинити
            } else {
                resolve(rows);
            }
        });
    });
}

function getUserByTelegramId(telegram_id, callback) {
    db.get(
        "SELECT * FROM users WHERE telegram_id = ?",
        [telegram_id.toString()],
        (err, row) => {
            if (err) {
                console.error(err);
                callback(null);
            } else {
                callback(row);
            }
        }
    );
}

module.exports = { saveUser, getAllUsers, getUserByTelegramId };
