import mysql from "mysql2";

export class MysqlAdapter {
    constructor(connectionInfo) {
        this.client = null;
        this.host = connectionInfo.host;
        this.database = connectionInfo.database;
        this.config = {
            host: connectionInfo.host,
            database: connectionInfo.database,
            port: connectionInfo.port || 3306,
            user: connectionInfo.user,
            password: connectionInfo.password,
            ssl: connectionInfo.ssl,
            connectionTimeoutMillis: connectionInfo.connectionTimeout || 3000000,
        };
    }

    async init() {
        return new Promise((resolve, reject) => {
        console.error(`[INFO] Connecting to MySQL: ${this.host}, Database: ${this.database}`);
        console.error(`[DEBUG] Connection details:`, {
            host: this.host,
            database: this.database,
            port: this.config.port,
            user: this.config.user,
            connectionTimeoutMillis: this.config.connectionTimeoutMillis,
            ssl: !!this.config.ssl
        });
        this.client = mysql.createConnection({
            host: this.config.host,
            user: this.config.user,
            password: this.config.password,
            database: this.config.database,
            port: this.config.port,
        });
        this.client.connect((err)=>{
            if (err) {
                console.error(`[ERROR] MySQL connection error: ${err.message}`);
                reject(err);
            } else {
                console.error("[INFO] MySQL connection established successfully");
                resolve();
            }
        });
    });
    }


    async all(query, params = []) {
        if (!this.client) {
            throw new Error("Database not initialized");
        }
        return new Promise((resolve, reject) => {
            this.client.query(query, params, (err, result, fields) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        });
    }

    async run(query, params = []) {
        if (!this.client) {
            throw new Error("Database not initialized");
        }
        return new Promise((resolve, reject) => {
            this.client.query(query, params, (err, result, fields) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve({changes: result.affectedRows, lastID: result.insertId});
                }
            });
        });
    }

    async exec(query, params = []) {
        if (!this.client) {
            throw new Error("Database not initialized");
        }
        return new Promise((resolve, reject) => {
            this.client.query(query, params, (err, result, fields) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        });
    }

    async close(){
        return new Promise((resolve, reject) => {
        if (!this.client) {
            resolve();
            return;
        }
        
        this.client.end((err) => {
            if (err) {
                reject(err);
            } else {
                this.client = null;
                resolve();
            }
        });
        });
    }

    getMetadata() {
        return {
            name: "MySQL",
            type: "mysql",
            server: this.host,
            database: this.database
        };
    }

    getListTablesQuery(){
        return "SHOW TABLES;";
    }

    getDescribeTableQuery(tableName){
        return `DESCRIBE ${tableName};`;
    }
}