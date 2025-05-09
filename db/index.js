import { createDbAdapter } from "./adapter.js";

let dbAdapter = null;

export async function initDatabase(connectionInfo, dbType = 'sqlite'){
    try {
      dbAdapter = createDbAdapter(dbType, connectionInfo);
      await dbAdapter.init();
    } catch (error) {
      throw new Error(`Failed to initialize database: ${error.message}`);
    }
}

export function dbAll(query, params=[]){
    if (!dbAdapter) {
      throw new Error("Database not initialized");
    }
    return dbAdapter.all(query, params);
}

export function dbRun(query, params=[]){
    if (!dbAdapter) {
      throw new Error("Database not initialized");
    }
    return dbAdapter.run(query, params);
}
  
export function dbExec(query){
    if (!dbAdapter) {
      throw new Error("Database not initialized");
    }
    return dbAdapter.exec(query);
}

export function closeDatabase(){
    if (!dbAdapter) {
      return Promise.resolve();
    }
    return dbAdapter.close();
}

export function getDatabaseMetadata(){
    if (!dbAdapter) {
      throw new Error("Database not initialized");
    }
    return dbAdapter.getMetadata();
}

export function getListTablesQuery(){
    if (!dbAdapter) {
      throw new Error("Database not initialized");
    }
    return dbAdapter.getListTablesQuery();
}

export function getDescribeTableQuery(tableName){
    if (!dbAdapter) {
      throw new Error("Database not initialized");
    }
    return dbAdapter.getDescribeTableQuery(tableName);
} 