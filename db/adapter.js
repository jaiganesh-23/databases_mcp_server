import { SqliteAdapter } from './sqlite-adapter.js';
import { MysqlAdapter } from './mysql-adapter.js';
import { PostgresqlAdapter } from './postgresql-adapter.js';
import { SqlServerAdapter } from './sqlserver-adapter.js';

export function createDbAdapter(type, connectionInfo){
    switch (type.toLowerCase()) {
      case 'sqlite':
        return new SqliteAdapter(connectionInfo);
      case 'mysql':
        return new MysqlAdapter(connectionInfo);
      case 'postgresql':
      case 'postgres':
        return new PostgresqlAdapter(connectionInfo);
      case 'sqlserver':
        return new SqlServerAdapter(connectionInfo);
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  } 