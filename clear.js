const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./users.db");

db.run("DELETE FROM users", function (err) {
    if (err) {
        return console.error("❌ Помилка при очищенні:", err.message);
    }
    console.log(`✅ Видалено ${this.changes} користувачів.`);
    db.close();
});
