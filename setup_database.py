import sqlite3

def create_database():
    conn = sqlite3.connect('enterprise.db')
    cursor = conn.cursor()

    # --- 1. THE STAFF DIRECTORY (New for Multi-User Support) ---
    # This table acts as the "Phonebook" for your AI.
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY,
        name TEXT,
        role TEXT,           -- e.g., 'CEO', 'CTO', 'HOD Sales'
        calendar_id TEXT,    -- Their Google Calendar Email
        access_level INTEGER -- 1=Basic, 2=HOD, 3=Exec
    )
    ''')

    # --- 2. THE ERP DATA (For our future Text-to-SQL logic) ---
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT,
        stock_level INTEGER,
        price REAL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY,
        customer_name TEXT,
        date TEXT,
        amount REAL,
        status TEXT
    )
    ''')

    # --- 3. SEED DUMMY DATA ---
    
    # Staff Data: Using placeholders. 
    # NOTE: In a real app, 'calendar_id' would be their actual gmail address.
    staff_members = [
        (1, 'Alice Bossman', 'CEO', 'primary', 3), # 'primary' is YOU for now
        (2, 'Bob Tech', 'CTO', 'bob.tech.demo@gmail.com', 3),
        (3, 'Charlie Sales', 'HOD Sales', 'charlie.sales.demo@gmail.com', 2)
    ]

    products = [
        (1, 'Laptop Pro X', 45, 1200.00),
        (2, 'Office Chair Ergonomic', 12, 350.50),
        (3, 'Wireless Mouse', 200, 25.00),
        (4, 'Server Rack Unit', 5, 5000.00)
    ]

    invoices = [
        (101, 'Acme Corp', '2023-10-01', 4500.00, 'PAID'),
        (102, 'Globex Inc', '2023-10-03', 12000.00, 'PENDING'),
        (103, 'Soylent Corp', '2023-10-05', 340.00, 'PAID')
    ]

    # Insert data
    cursor.executemany('INSERT OR IGNORE INTO staff VALUES (?,?,?,?,?)', staff_members)
    cursor.executemany('INSERT OR IGNORE INTO products VALUES (?,?,?,?)', products)
    cursor.executemany('INSERT OR IGNORE INTO invoices VALUES (?,?,?,?,?)', invoices)

    conn.commit()
    conn.close()
    print("Enterprise Database created with Staff Directory.")

if __name__ == "__main__":
    create_database()