import pg from 'pg';

export class PostgresqlAdapter {
    constructor(connectionInfo) {
        this.client = null;
        this.host = connectionInfo.host;
        this.database = connectionInfo.database;

        this.config = {
            host: connectionInfo.host,
            database: connectionInfo.database,
            port: connectionInfo.port || 5432,
            user: connectionInfo.user,
            password: connectionInfo.password,
            ssl: connectionInfo.ssl,

            connectionTimeoutMillis: connectionInfo.connectionTimeout || 3000000,
        };
    }

    async init() {
        try {
            console.error(`[INFO] Connecting to PostgreSQL: ${this.host}, Database: ${this.database}`);
            console.error(`[DEBUG] Connection details:`, {
                host: this.host,
                database: this.database,
                port: this.config.port,
                user: this.config.user,
                connectionTimeoutMillis: this.config.connectionTimeoutMillis,
                ssl: !!this.config.ssl
            });
            this.client = new pg.Client(this.config);
            await this.client.connect();
            console.error(`[INFO] PostgreSQL connection established successfully`);
        }
        catch (err) {
            console.error(`[ERROR] PostgreSQL connection error: ${err.message}`);
            throw new Error(`Failed to connect to PostgreSQL: ${err.message}`);
        }
    }

    async all(query, params = []) {
        if (!this.client) {
            throw new Error("Database not initialized");
        }
        try {
            // PostgreSQL uses $1, $2, etc. for parameterized queries
            const preparedQuery = query.replace(/\?/g, (_, i) => `$${i + 1}`);
            const result = await this.client.query(preparedQuery, params);
            return result.rows;
        }
        catch (err) {
            throw new Error(`PostgreSQL query error: ${err.message}`);
        }
    }

    async run(query, params = []) {
        if (!this.client) {
            throw new Error("Database not initialized");
        }
        try {
            // Replace ? with numbered parameters
            const preparedQuery = query.replace(/\?/g, (_, i) => `$${i + 1}`);
            let lastID = 0;
            let changes = 0;
            // For INSERT queries, try to get the inserted ID
            if (query.trim().toUpperCase().startsWith('INSERT')) {
                // Add RETURNING clause to get the inserted ID if it doesn't already have one
                const returningQuery = preparedQuery.includes('RETURNING')
                    ? preparedQuery
                    : `${preparedQuery} RETURNING id`;
                const result = await this.client.query(returningQuery, params);
                changes = result.rowCount || 0;
                lastID = result.rows[0]?.id || 0;
            }
            else {
                const result = await this.client.query(preparedQuery, params);
                changes = result.rowCount || 0;
            }
            return { changes, lastID };
        }
        catch (err) {
            throw new Error(`PostgreSQL query error: ${err.message}`);
        }
    }

    async exec(query) {
        if (!this.client) {
            throw new Error("Database not initialized");
        }
        try {
            await this.client.query(query);
        }
        catch (err) {
            throw new Error(`PostgreSQL batch error: ${err.message}`);
        }
    }

    async close() {
        if (this.client) {
            await this.client.end();
            this.client = null;
        }
    }

    getMetadata() {
        return {
            name: "PostgreSQL",
            type: "postgresql",
            server: this.host,
            database: this.database
        };
    }

    getListTablesQuery() {
        return "SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name";
    }

    getDescribeTableQuery(tableName) {
        return `
      SELECT 
        c.column_name as name,
        c.data_type as type,
        CASE WHEN c.is_nullable = 'NO' THEN 1 ELSE 0 END as notnull,
        CASE WHEN pk.constraint_name IS NOT NULL THEN 1 ELSE 0 END as pk,
        c.column_default as dflt_value
      FROM 
        information_schema.columns c
      LEFT JOIN 
        information_schema.key_column_usage kcu 
        ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
      LEFT JOIN 
        information_schema.table_constraints pk 
        ON kcu.constraint_name = pk.constraint_name AND pk.constraint_type = 'PRIMARY KEY'
      WHERE 
        c.table_name = '${tableName}'
        AND c.table_schema = 'public'
      ORDER BY 
        c.ordinal_position
    `;
    }
}
