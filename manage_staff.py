import sqlite3

def list_staff():
    """Reads and prints all staff members from the database."""
    conn = sqlite3.connect('enterprise.db')
    cursor = conn.cursor()
    
    print("\n--- 👥 CURRENT STAFF DIRECTORY ---")
    print(f"{'ID':<5} {'Name':<20} {'Role':<15} {'Calendar ID (Email)':<30}")
    print("-" * 75)
    
    cursor.execute("SELECT id, name, role, calendar_id FROM staff")
    rows = cursor.fetchall()
    
    for row in rows:
        # row[0]=id, row[1]=name, row[2]=role, row[3]=email
        print(f"{row[0]:<5} {row[1]:<20} {row[2]:<15} {row[3]:<30}")
    
    print("-" * 75)
    conn.close()

def update_staff_email(role_name, new_email):
    """Updates the calendar email for a specific role."""
    conn = sqlite3.connect('enterprise.db')
    cursor = conn.cursor()
    
    # Check if role exists first
    cursor.execute("SELECT name FROM staff WHERE role = ?", (role_name,))
    result = cursor.fetchone()
    
    if result:
        # The SQL Command to change data
        cursor.execute("UPDATE staff SET calendar_id = ? WHERE role = ?", (new_email, role_name))
        conn.commit()
        print(f"\n✅ SUCCESS: Updated {role_name} (Name: {result[0]}) to email: {new_email}")
    else:
        print(f"\n❌ ERROR: Role '{role_name}' not found.")
    
    conn.close()

# --- MAIN MENU ---
if __name__ == "__main__":
    while True:
        list_staff()
        print("\nOptions:")
        print("1. Update a Staff Member's Email")
        print("2. Exit")
        
        choice = input("\nEnter choice (1/2): ")
        
        if choice == '1':
            role = input("Enter the Role to update (e.g., CTO, HOD Sales): ")
            email = input(f"Enter the new Google Email for {role}: ")
            update_staff_email(role, email)
        elif choice == '2':
            print("Exiting...")
            break
        else:
            print("Invalid choice, try again.")