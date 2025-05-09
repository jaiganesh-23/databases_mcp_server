import sqlite3 from "sqlite3";

export class SqliteAdapter{
    db = null;
    dbPath=null;

    constructor(dbPath) {
        this.dbPath = dbPath;
    }

    async init(){
        return new Promise((resolve, reject) => {
        
        console.error(`[INFO] Opening SQLite database at: ${this.dbPath}`);
        this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
            if (err) {
                console.error(`[ERROR] SQLite connection error: ${err.message}`);
                reject(err);
            } else {
                console.error("[INFO] SQLite database opened successfully");
                resolve();
            }
        });
        });
    }

    async all(query, params=[]){
        if (!this.db) {
        throw new Error("Database not initialized");
        }

        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async run(query, params=[]){
        if (!this.db) {
        throw new Error("Database not initialized");
        }

        return new Promise((resolve, reject) => {
            this.db.run(query, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes, lastID: this.lastID });
                }
            });
        });
    }

    async exec(query){
        if (!this.db) {
        throw new Error("Database not initialized");
        }

        return new Promise((resolve, reject) => {
            this.db.exec(query, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async close(){
        return new Promise((resolve, reject) => {
        if (!this.db) {
            resolve();
            return;
        }
        
        this.db.close((err) => {
            if (err) {
                reject(err);
            } else {
                this.db = null;
                resolve();
            }
        });
        });
    }

    getMetadata(){
        return {
            name: "SQLite",
            type: "sqlite",
            path: this.dbPath
        };
    }

    getListTablesQuery(){
        return "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
    }

    getDescribeTableQuery(tableName){
        return `PRAGMA table_info(${tableName})`;
    }
} 