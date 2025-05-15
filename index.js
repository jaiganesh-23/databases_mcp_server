import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initDatabase, closeDatabase, getDatabaseMetadata, getListTablesQuery, getDescribeTableQuery, dbAll, dbRun, dbExec } from './db/index.js';
import { formatErrorResponse, formatSuccessResponse, convertToCSV } from './utils/formatUtils.js';
import { z } from 'zod';

const logger = {
    log: (...args) => console.error('[INFO]', ...args),
    error: (...args) => console.error('[ERROR]', ...args),
    warn: (...args) => console.error('[WARN]', ...args),
    info: (...args) => console.error('[INFO]', ...args),
};
  

const server = new McpServer(
    {
        name: "my_mcp_database_server",
        version: "1.0.0",
    },
    {
        capabilities: {
            resources: {},
            tools: {},
        },
    }
);

const args = process.argv.slice(2);
if (args.length === 0) {
  logger.error("Please provide database connection information");
  logger.error("Usage for SQLite: node index.js <database_file_path>");
  logger.error("Usage for MySQL: node index.js --mysql --host <host> --database <database> [--user <user> --password <password> --port <port>]");
  process.exit(1);
}

let dbType = 'sqlite';
let connectionInfo= null;
if (args.includes('--sqlserver')) {
    dbType = 'sqlserver';
    connectionInfo = {
        server: '',
        database: '',
        user: undefined,
        password: undefined
    };
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--server' && i + 1 < args.length) {
            connectionInfo.server = args[i + 1];
        }
        else if (args[i] === '--database' && i + 1 < args.length) {
            connectionInfo.database = args[i + 1];
        }
        else if (args[i] === '--user' && i + 1 < args.length) {
            connectionInfo.user = args[i + 1];
        }
        else if (args[i] === '--password' && i + 1 < args.length) {
            connectionInfo.password = args[i + 1];
        }
        else if (args[i] === '--port' && i + 1 < args.length) {
            connectionInfo.port = parseInt(args[i + 1], 10);
        }
    }
    if (!connectionInfo.server || !connectionInfo.database) {
        logger.error("Error: SQL Server requires --server and --database parameters");
        process.exit(1);
    }
}
else if (args.includes('--mysql')) {
    dbType = 'mysql';
    connectionInfo = {
      host: '',
      database: '',
      user: undefined,
      password: undefined,
      port: undefined,
      ssl: undefined,
      connectionTimeout: undefined
    };
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--host' && i + 1 < args.length) {
        connectionInfo.host = args[i + 1];
      } else if (args[i] === '--database' && i + 1 < args.length) {
        connectionInfo.database = args[i + 1];
      } else if (args[i] === '--user' && i + 1 < args.length) {
        connectionInfo.user = args[i + 1];
      } else if (args[i] === '--password' && i + 1 < args.length) {
        connectionInfo.password = args[i + 1];
      } else if (args[i] === '--port' && i + 1 < args.length) {
        connectionInfo.port = parseInt(args[i + 1], 10);
      } else if (args[i] === '--ssl' && i + 1 < args.length) {
        connectionInfo.ssl = args[i + 1] === 'true';
      } else if (args[i] === '--connection-timeout' && i + 1 < args.length) {
        connectionInfo.connectionTimeout = parseInt(args[i + 1], 10);
      }
    }
    
    if (!connectionInfo.host || !connectionInfo.database) {
      logger.error("Error: MySQL requires --host and --database parameters");
      process.exit(1);
    }
}
else if (args.includes('--postgresql') || args.includes('--postgres')) {
    dbType = 'postgresql';
    connectionInfo = {
        host: '',
        database: '',
        user: undefined,
        password: undefined,
        port: undefined,
        ssl: undefined,
        connectionTimeout: undefined
    };
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--host' && i + 1 < args.length) {
            connectionInfo.host = args[i + 1];
        }
        else if (args[i] === '--database' && i + 1 < args.length) {
            connectionInfo.database = args[i + 1];
        }
        else if (args[i] === '--user' && i + 1 < args.length) {
            connectionInfo.user = args[i + 1];
        }
        else if (args[i] === '--password' && i + 1 < args.length) {
            connectionInfo.password = args[i + 1];
        }
        else if (args[i] === '--port' && i + 1 < args.length) {
            connectionInfo.port = parseInt(args[i + 1], 10);
        }
        else if (args[i] === '--ssl' && i + 1 < args.length) {
            connectionInfo.ssl = args[i + 1] === 'true';
        }
        else if (args[i] === '--connection-timeout' && i + 1 < args.length) {
            connectionInfo.connectionTimeout = parseInt(args[i + 1], 10);
        }
    }
    if (!connectionInfo.host || !connectionInfo.database) {
        logger.error("Error: PostgreSQL requires --host and --database parameters");
        process.exit(1);
    }
}
else {

    dbType = 'sqlite';
    connectionInfo = args[0]; 
    logger.info(`Using SQLite database at path: ${connectionInfo}`);
}

async function initializeDatabase() {
  try {
    logger.info(`Initializing ${dbType} database...`);
    if (dbType === 'sqlite') {
      logger.info(`Database path: ${connectionInfo}`);
    }
    else if (dbType === 'sqlserver') {
      logger.info(`Server: ${connectionInfo.server}, Database: ${connectionInfo.database}`);
    }
    else if (dbType === 'mysql') {
      logger.info(`Host: ${connectionInfo.host}, Database: ${connectionInfo.database}`);
    }
    else if (dbType === 'postgresql') {
      logger.info(`Host: ${connectionInfo.host}, Database: ${connectionInfo.database}`);
    }
    // Initialize the database
    await initDatabase(connectionInfo, dbType);
    
    const dbInfo = getDatabaseMetadata();
    logger.info(`Connected to ${dbInfo.name} database`);
  } catch (error) {
    logger.error("Failed to initialize:", error);
    process.exit(1);
  }
}

initializeDatabase().catch(error => {
  logger.error("Server initialization failed:", error);
  process.exit(1);
}); 


let result = null;
let SCHEMA_PATH = null;
let resourceBaseUrl = null;
try{
    const dbInfo = getDatabaseMetadata();
    if (dbType === 'sqlite' && dbInfo.path) {
        resourceBaseUrl = new URL(`sqlite:///${dbInfo.path}`);
    } else if (dbType === 'mysql' && dbInfo.server && dbInfo.database) {
        resourceBaseUrl = new URL(`mysql://${dbInfo.server}/${dbInfo.database}`);
    } else {
        resourceBaseUrl = new URL(`db:///database`);
    }
    
    SCHEMA_PATH = "schema";

    const query = getListTablesQuery();
    result = await dbAll(query);
} catch (error) {
    throw new Error(`Error loading resources: ${error.message}`);
}


result.forEach(row => {
    server.resource(`${row.name} schema`, new ResourceTemplate(new URL(`${row.name}/${SCHEMA_PATH}`, resourceBaseUrl).href, { list: undefined }),
        async (uri) => {
            try{
                const resourceUrl = new URL(uri);
                const SCHEMA_PATH = "schema";

                const pathComponents = resourceUrl.pathname.split("/");
                const schema = pathComponents.pop();
                const tableName = pathComponents.pop();

                if (schema !== SCHEMA_PATH) {
                throw new Error("Invalid resource URI");
                }

                const query = getDescribeTableQuery(tableName);
                const result = await dbAll(query);

                return {
                    contents: [
                        {
                            uri,
                            mimeType: "application/json",
                            text: JSON.stringify(result.map((column) => ({
                                column_name: column.name,
                                data_type: column.type
                            })), null, 2),
                        },
                    ],
                };
            } catch (error) {
                throw new Error(`Error reading resource: ${error.message}`);
            }
    })
});


server.tool("read_query", 
"Execute SELECT queries to read data from the database",
  {
    query: z.string(),
  },
   async ({query}) => {
    try {
        if (!query.trim().toLowerCase().startsWith("select")) {
          throw new Error("Only SELECT queries are allowed with read_query");
    }
    const result = await dbAll(query);
    return formatSuccessResponse(result);
    } catch (error) {
        throw new Error(`SQL Error: ${error.message}`);
    }
})

server.tool("write_query",
"Execute INSERT, UPDATE, or DELETE queries",
  {
    query: z.string(),
  }
  ,async ({query}) => {
    try {
        const lowerQuery = query.trim().toLowerCase();
        
        if (lowerQuery.startsWith("select")) {
          throw new Error("Use read_query for SELECT operations");
        }
        
        if (!(lowerQuery.startsWith("insert") || lowerQuery.startsWith("update") || lowerQuery.startsWith("delete"))) {
          throw new Error("Only INSERT, UPDATE, or DELETE operations are allowed with write_query");
        }
    
        const result = await dbRun(query);
        return formatSuccessResponse({affected_rows: result.changes});
      } catch (error) {
        throw new Error(`SQL Error: ${error.message}`);
      }
})

server.tool("create_table",
   "Create new tables in the database",
    {
      query: z.string(),
    },async ({query}) => {
    try {
        if (!query.trim().toLowerCase().startsWith("create table")) {
          throw new Error("Only CREATE TABLE statements are allowed");
        }
    
        await dbExec(query);
        return formatSuccessResponse({ success: true, message: "Table created successfully" });
      } catch (error) {
        throw new Error(`SQL Error: ${error.message}`);
      }
})

server.tool("alter_table",
"Modify existing table schema (add columns, rename tables, etc.)",
  {
    query: z.string(),
  }
  ,async ({query}) => {
    try {
        if (!query.trim().toLowerCase().startsWith("alter table")) {
          throw new Error("Only ALTER TABLE statements are allowed");
        }
    
        await dbExec(query);
        return formatSuccessResponse({ success: true, message: "Table altered successfully" });
      } catch (error) {
        throw new Error(`SQL Error: ${error.message}`);
      }
})

server.tool("drop_table",
"Remove a table from the database with safety confirmation",
    {
      tableName: z.string(),
      confirm: z.boolean(),
    }
  ,async ({tableName, confirm}) => {
    try {
        if (!tableName) {
          throw new Error("Table name is required");
        }
        
        if (!confirm) {
          return formatSuccessResponse({ 
            success: false, 
            message: "Safety confirmation required. Set confirm=true to proceed with dropping the table." 
          });
        }
  
        await dbExec(`DROP TABLE "${tableName}"`);
        
        return formatSuccessResponse({ success: true, message: `Table '${tableName}' dropped successfully` });
      } catch (error) {
        throw new Error(`Error dropping table: ${error.message}`);
      }
})

server.tool("export_query", 
"Export query results to various formats (CSV, JSON)",
{
    query: z.string(),
    format: z.enum(["csv", "json"]),
}
  ,async ({query, format}) => {
    try {
        if (!query.trim().toLowerCase().startsWith("select")) {
          throw new Error("Only SELECT queries are allowed with export_query");
        }
    
        const result = await dbAll(query);
        
        if (format === "csv") {
          const csvData = convertToCSV(result);
          return {
            content: [{ 
              type: "text", 
              text: csvData
            }],
            isError: false,
          };
        } else if (format === "json") {
            return formatSuccessResponse(result);
        } else {
          throw new Error("Unsupported export format. Use 'csv' or 'json'");
        }
      } catch (error) {
        throw new Error(`Export Error: ${error.message}`);
      }
})

server.tool("list_tables",
    "Get a list of all tables in the database", 
    {},
  async () => {
    try {
        const query = getListTablesQuery();
        const tables = await dbAll(query);
        return formatSuccessResponse(tables);
      } catch (error) {
        throw new Error(`Error listing tables: ${error.message}`);
      }
})

server.tool("describe_table",
  "View schema information for a specific table",
  {
    tableName: z.string(),
  }
   ,async ({tableName}) => {
    try {
        if (!tableName) {
          throw new Error("Table name is required");
        }
           
        const descQuery = getDescribeTableQuery(tableName);
        const columns = await dbAll(descQuery);
        
        return formatSuccessResponse(columns);
      } catch (error) {
        throw new Error(`Error describing table: ${error.message}`);
      }
})

server.tool("append_insight",
  "Add a business insight to the memo",
  {
    insight: z.string(),
  }
  ,async({insight}) => {
    try {
        if (!insight) {
          throw new Error("Insight text is required");
        }
    
        await dbExec(`
          CREATE TABLE IF NOT EXISTS mcp_insights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            insight TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        await dbRun(
          "INSERT INTO mcp_insights (insight) VALUES (?)",
          [insight]
        );
        
        return formatSuccessResponse({ success: true, message: "Insight added" });
      } catch (error) {
        throw new Error(`Error adding insight: ${error.message}`);
      }
})

server.tool("list_insights", 
  "List all business insights in the memo",
  {}
  ,async() => {
    try {
        // Check if insights table exists
        const tableExists = await dbAll(
          "SELECT name FROM sqlite_master WHERE type='table' AND name = 'mcp_insights'"
        );
        
        if (tableExists.length === 0) {
          // Create table if it doesn't exist
          await dbExec(`
            CREATE TABLE IF NOT EXISTS mcp_insights (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              insight TEXT NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          return formatSuccessResponse([]);
        }
        
        const insights = await dbAll("SELECT * FROM mcp_insights ORDER BY created_at DESC");
        return formatSuccessResponse(insights);
      } catch (error) {
        throw new Error(`Error listing insights: ${error.message}`);
      }
})

process.on('SIGINT', async () => {
    logger.info('Shutting down gracefully...');
    await closeDatabase();
    process.exit(0);
});
  
process.on('SIGTERM', async () => {
    logger.info('Shutting down gracefully...');
    await closeDatabase();
    process.exit(0);
});
  
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
});
  
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});


async function startSever(){
  try{
    logger.info('Starting MCP server...');
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info('Server running. Press Ctrl+C to exit.');
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
}

startSever().catch(error => {
    logger.error("Server startup failed:", error);
    process.exit(1);
});
