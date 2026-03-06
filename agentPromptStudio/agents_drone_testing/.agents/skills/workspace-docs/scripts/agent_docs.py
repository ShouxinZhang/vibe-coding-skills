import sqlite3
import argparse
import os
import shutil
from datetime import datetime
from pathlib import Path

# Define paths
SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
# MODULE_ROOT is agentPromptStudio/agents_drone_testing/
MODULE_ROOT = SKILL_DIR.parent.parent.parent
REPO_ROOT = MODULE_ROOT.parent.parent
DOCS_DIR = REPO_ROOT / "docs"
TEMPLATE_DB_PATH = SKILL_DIR / "workspace_docs.db"
DB_PATH = DOCS_DIR / "workspace_docs.db"


def ensure_runtime_storage():
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    if DB_PATH.exists():
        return
    if TEMPLATE_DB_PATH.exists():
        shutil.copy2(TEMPLATE_DB_PATH, DB_PATH)
        return
    sqlite3.connect(DB_PATH).close()

def get_db():
    ensure_runtime_storage()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS workspace_nodes (
                path TEXT PRIMARY KEY,
                type TEXT,
                description TEXT,
                agent_notes TEXT,
                last_updated TEXT
            )
        ''')
        conn.commit()

def cmd_set(args):
    path = args.path
    full_path = MODULE_ROOT / path
    node_type = 'directory' if full_path.is_dir() else 'file'
    now = datetime.now().isoformat()
    
    with get_db() as conn:
        # Check if exists to preserve old data if not provided
        cursor = conn.execute('SELECT description, agent_notes FROM workspace_nodes WHERE path = ?', (path,))
        row = cursor.fetchone()
        
        desc = args.desc if args.desc is not None else (row['description'] if row else "")
        notes = args.notes if args.notes is not None else (row['agent_notes'] if row else "")
        
        conn.execute('''
            INSERT OR REPLACE INTO workspace_nodes (path, type, description, agent_notes, last_updated)
            VALUES (?, ?, ?, ?, ?)
        ''', (path, node_type, desc, notes, now))
        conn.commit()
    print(f"Successfully updated documentation for '{path}'.")

def cmd_get(args):
    with get_db() as conn:
        cursor = conn.execute('SELECT * FROM workspace_nodes WHERE path = ?', (args.path,))
        row = cursor.fetchone()
        if row:
            print(f"--- {row['path']} ({row['type']}) ---")
            print(f"Description: {row['description']}")
            print(f"Agent Notes: {row['agent_notes']}")
            print(f"Last Updated: {row['last_updated']}")
        else:
            print(f"No documentation found for '{args.path}'.")

def cmd_delete(args):
    with get_db() as conn:
        conn.execute('DELETE FROM workspace_nodes WHERE path = ?', (args.path,))
        conn.commit()
    print(f"Successfully deleted documentation for '{args.path}'.")

def cmd_scan(args):
    ignore_dirs = {'venv', 'env', 'node_modules'}
    added_count = 0
    
    with get_db() as conn:
        for root, dirs, files in os.walk(MODULE_ROOT):
            # Modify dirs in-place to skip ignored directories and hidden/cache dirs
            dirs[:] = [d for d in dirs if d not in ignore_dirs and not d.startswith('.') and not d.startswith('__')]
            
            for name in files + dirs:
                full_path = Path(root) / name
                rel_path = full_path.relative_to(MODULE_ROOT).as_posix()
                
                if name.endswith('.pyc') or name == '.DS_Store' or name.endswith('.db'):
                    continue
                    
                node_type = 'directory' if full_path.is_dir() else 'file'
                
                cursor = conn.execute('SELECT 1 FROM workspace_nodes WHERE path = ?', (rel_path,))
                if not cursor.fetchone():
                    now = datetime.now().isoformat()
                    conn.execute('''
                        INSERT INTO workspace_nodes (path, type, description, agent_notes, last_updated)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (rel_path, node_type, "待补充描述 (Pending description)", "", now))
                    added_count += 1
        conn.commit()
    print(f"Scan complete. Added {added_count} new undocumented items.")

def cmd_export(args):
    init_db()
    print(
        "Export is deprecated. Workspace documentation is stored in "
        f"{DB_PATH} and no WORKSPACE_MAP.md will be generated."
    )

def main():
    init_db()
    parser = argparse.ArgumentParser(description="Workspace Documentation Manager for Agents")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # Set command
    parser_set = subparsers.add_parser("set", help="Set or update documentation for a path")
    parser_set.add_argument("path", help="Relative path to the file or directory")
    parser_set.add_argument("-d", "--desc", help="Short description of the file/directory")
    parser_set.add_argument("-n", "--notes", help="Specific notes or rules for the AI Agent")
    
    # Get command
    parser_get = subparsers.add_parser("get", help="Get documentation for a path")
    parser_get.add_argument("path", help="Relative path to the file or directory")
    
    # Delete command
    parser_delete = subparsers.add_parser("delete", help="Delete documentation for a path")
    parser_delete.add_argument("path", help="Relative path to the file or directory")
    
    # Scan command
    subparsers.add_parser("scan", help="Scan workspace for undocumented files")
    
    # Export command
    subparsers.add_parser("export", help="Deprecated compatibility command; no markdown file is generated")
    
    args = parser.parse_args()
    
    if args.command == "set":
        cmd_set(args)
    elif args.command == "get":
        cmd_get(args)
    elif args.command == "delete":
        cmd_delete(args)
    elif args.command == "scan":
        cmd_scan(args)
    elif args.command == "export":
        cmd_export(args)

if __name__ == "__main__":
    main()
