import sqlite3

def fix_branches():
    conn = sqlite3.connect('sql_app.db')
    cursor = conn.cursor()
    
    # Map locations to branch IDs
    # e.g., 'Sydney' -> SYD branch
    cursor.execute("SELECT id, name FROM branches")
    branches = cursor.fetchall()
    
    branch_map = {}
    for b_id, b_name in branches:
        branch_map[b_name.lower()] = b_id
        if b_name == 'SYD':
            branch_map['sydney'] = b_id
        elif b_name == 'MEL':
            branch_map['melbourne'] = b_id
        elif b_name == 'BNE':
            branch_map['brisbane'] = b_id
        elif b_name == 'ADL':
            branch_map['adelaide'] = b_id
        elif b_name == 'FRE':
            branch_map['fremantle'] = b_id
            
    cursor.execute("SELECT id, location FROM incidents")
    incidents = cursor.fetchall()
    
    for inc_id, loc in incidents:
        loc_lower = (loc or "").lower()
        new_branch_id = None
        for key, b_id in branch_map.items():
            if key in loc_lower:
                new_branch_id = b_id
                break
                
        if new_branch_id:
            cursor.execute("UPDATE incidents SET branch_id = ? WHERE id = ?", (new_branch_id, inc_id))
            print(f"Updated incident {inc_id} to branch_id {new_branch_id}")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    fix_branches()
