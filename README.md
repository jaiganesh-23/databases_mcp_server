Created a MCP Server that connects to databases(currently sqlite, mysql, postgresql and sqlserver) and perform queries on them automatically with natural language.<br><br><br>
Usage with VS Code<br><br>
```
For Mysql
"mcp": {
        "inputs": [],
        "servers": {
            "mysql": {
            "command": "node",
            "args": [
                "absolute/path/to/index.js", 
                "--mysql",
                "--host","host",
                "--database","database",
                "--user","user",
                "--password","password",
                ]
            }
        }
    }

For Sqlite
"mcp": {
        "inputs": [],
        "servers": {
            "sqlite": {
            "command": "node",
            "args": [
                "absolute/path/to/index.js", 
                "absolute/path/to/database.db",
                ]
            }
        }
    }

For Postgresql
"mcp": {
        "inputs": [],
        "servers": {
            "mysql": {
            "command": "node",
            "args": [
                "absolute/path/to/index.js", 
                "--postgresql",
                "--host","host",
                "--database","database",
                "--user","user",
                "--password","password",
                "--ssl","true",
                ]
            }
        }
    }

For Sqlserver
"mcp": {
        "inputs": [],
        "servers": {
            "mysql": {
            "command": "node",
            "args": [
                "absolute/path/to/index.js", 
                "--sqlserver",
                "--server","server",
                "--database","database",
                "--user","user",
                "--password","password",
                ]
            }
        }
    }
```
