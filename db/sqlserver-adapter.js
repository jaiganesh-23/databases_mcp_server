import sql from 'mssql';

export class SqlServerAdapter {
    constructor(connectionInfo) {
        this.pool = null;
        this.server = connectionInfo.server;
        this.database = connectionInfo.database;

        this.config = {
            server: connectionInfo.server,
            database: connectionInfo.database,
            port: connectionInfo.port || 1433,
            options: {
                trustServerCertificate: connectionInfo.trustServerCertificate ?? true,
                ...connectionInfo.options
            }
        };

        if (connectionInfo.user && connectionInfo.password) {
            this.config.user = connectionInfo.user;
            this.config.password = connectionInfo.password;
        }
        else {

            this.config.options.trustedConnection = true;
            this.config.options.enableArithAbort = true;
        }
    }

    async init() {
        try {
            console.error(`[INFO] Connecting to SQL Server: ${this.server}, Database: ${this.database}`);
            this.pool = await new sql.ConnectionPool(this.config).connect();
            console.error(`[INFO] SQL Server connection established successfully`);
        }
        catch (err) {
            console.error(`[ERROR] SQL Server connection error: ${err.message}`);
            throw new Error(`Failed to connect to SQL Server: ${err.message}`);
        }
    }

    async all(query, params = []) {
        if (!this.pool) {
            throw new Error("Database not initialized");
        }
        try {
            const request = this.pool.request();

            params.forEach((param, index) => {
                request.input(`param${index}`, param);
            });

            const preparedQuery = query.replace(/\?/g, (_, i) => `@param${i}`);
            const result = await request.query(preparedQuery);
            return result.recordset;
        }
        catch (err) {
            throw new Error(`SQL Server query error: ${err.message}`);
        }
    }

    async run(query, params = []) {
        if (!this.pool) {
            throw new Error("Database not initialized");
        }
        try {
            const request = this.pool.request();

            params.forEach((param, index) => {
                request.input(`param${index}`, param);
            });

            const preparedQuery = query.replace(/\?/g, (_, i) => `@param${i}`);

            let lastID = 0;
            if (query.trim().toUpperCase().startsWith('INSERT')) {
                request.output('insertedId', sql.Int, 0);
                const updatedQuery = `${preparedQuery}; SELECT @insertedId = SCOPE_IDENTITY();`;
                const result = await request.query(updatedQuery);
                lastID = result.output.insertedId || 0;
            }
            else {
                const result = await request.query(preparedQuery);
                lastID = 0;
            }
            return {
                changes: this.getAffectedRows(query, lastID),
                lastID: lastID
            };
        }
        catch (err) {
            throw new Error(`SQL Server query error: ${err.message}`);
        }
    }

    async exec(query) {
        if (!this.pool) {
            throw new Error("Database not initialized");
        }
        try {
            const request = this.pool.request();
            await request.batch(query);
        }
        catch (err) {
            throw new Error(`SQL Server batch error: ${err.message}`);
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.close();
            this.pool = null;
        }
    }

    getMetadata() {
        return {
            name: "SQL Server",
            type: "sqlserver",
            server: this.server,
            database: this.database
        };
    }

    getListTablesQuery() {
        return "SELECT TABLE_NAME as name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME";
    }

    getDescribeTableQuery(tableName) {
        return `
      SELECT 
        c.COLUMN_NAME as name,
        c.DATA_TYPE as type,
        CASE WHEN c.IS_NULLABLE = 'YES' THEN 1 ELSE 0 END as notnull,
        CASE WHEN pk.CONSTRAINT_TYPE = 'PRIMARY KEY' THEN 1 ELSE 0 END as pk,
        c.COLUMN_DEFAULT as dflt_value
      FROM 
        INFORMATION_SCHEMA.COLUMNS c
      LEFT JOIN 
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu ON c.TABLE_NAME = kcu.TABLE_NAME AND c.COLUMN_NAME = kcu.COLUMN_NAME
      LEFT JOIN 
        INFORMATION_SCHEMA.TABLE_CONSTRAINTS pk ON kcu.CONSTRAINT_NAME = pk.CONSTRAINT_NAME AND pk.CONSTRAINT_TYPE = 'PRIMARY KEY'
      WHERE 
        c.TABLE_NAME = '${tableName}'
      ORDER BY 
        c.ORDINAL_POSITION
    `;
    }

    getAffectedRows(query, lastID) {
        const queryType = query.trim().split(' ')[0].toUpperCase();
        if (queryType === 'INSERT' && lastID > 0) {
            return 1;
        }
        return 0; 
    }
}
