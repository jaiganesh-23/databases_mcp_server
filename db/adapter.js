import { SqliteAdapter } from './sqlite-adapter.js';
import { MysqlAdapter } from './mysql-adapter.js';

export function createDbAdapter(type, connectionInfo){
    switch (type.toLowerCase()) {
      case 'sqlite':
        return new SqliteAdapter(connectionInfo);
      case 'mysql':
        return new MysqlAdapter(connectionInfo);
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  } 