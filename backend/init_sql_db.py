import pyodbc

# Connection string for Local SQL Server (Windows Authentication)
conn_str = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=localhost;"
    "DATABASE=CargoWiseDB;"
    "Trusted_Connection=yes;"
)

def create_tables():
    print("Connecting to SQL Server...")
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        print("Connected successfully. Creating tables...")

        # 1. Create Branches Table
        cursor.execute("""
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'branches')
        BEGIN
            CREATE TABLE branches (
                id INT PRIMARY KEY IDENTITY(1,1),
                name NVARCHAR(255) NOT NULL,
                business_unit NVARCHAR(255) NOT NULL
            );
            print('Created table: branches');
        END
        ELSE print('Table branches already exists.');
        """)

        # 2. Create Users Table
        cursor.execute("""
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
        BEGIN
            CREATE TABLE users (
                id INT PRIMARY KEY IDENTITY(1,1),
                email NVARCHAR(255) UNIQUE NOT NULL,
                name NVARCHAR(255) NOT NULL,
                hashed_password NVARCHAR(MAX) NOT NULL,
                role NVARCHAR(50) DEFAULT 'branch_user',
                branch_id INT FOREIGN KEY REFERENCES branches(id)
            );
            print('Created table: users');
        END
        ELSE print('Table users already exists.');
        """)

        # 3. Create Incidents Table
        cursor.execute("""
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'incidents')
        BEGIN
            CREATE TABLE incidents (
                id INT PRIMARY KEY IDENTITY(1,1),
                type NVARCHAR(255),
                date DATETIME DEFAULT GETDATE(),
                location NVARCHAR(255),
                description NVARCHAR(MAX),
                job_number NVARCHAR(100),
                status NVARCHAR(50) DEFAULT 'Open',
                creator_id INT FOREIGN KEY REFERENCES users(id),
                branch_id INT FOREIGN KEY REFERENCES branches(id),
                -- Enrichment Fields
                bill_of_lading NVARCHAR(255),
                customer_name NVARCHAR(255),
                vessel_details NVARCHAR(255),
                departure_date DATETIME,
                arrival_date DATETIME,
                vault NVARCHAR(255),
                incident_number_str NVARCHAR(100),
                responsible_party NVARCHAR(255),
                company_liability NVARCHAR(255),
                cor_risk_level NVARCHAR(50),
                cor_assessment NVARCHAR(MAX),
                corrective_actions NVARCHAR(MAX),
                status_remarks NVARCHAR(MAX),
                -- M-Files Parity Fields
                name NVARCHAR(255),
                incident_state NVARCHAR(100),
                state_location NVARCHAR(50),
                cor_required NVARCHAR(10),
                dupli NVARCHAR(10),
                cant_find_email NVARCHAR(10),
                email_subject NVARCHAR(500),
                follow_up_1 NVARCHAR(255),
                follow_up_2 NVARCHAR(255),
                follow_up_3 NVARCHAR(255),
                follow_up_4 NVARCHAR(255),
                follow_up_5 NVARCHAR(255),
                -- Legal Workflow
                legal_assessment_status NVARCHAR(50) DEFAULT 'Pending',
                risk_assessment_status NVARCHAR(50) DEFAULT 'Pending'
            );
            print('Created table: incidents');
        END
        ELSE print('Table incidents already exists.');
        """)
        
        # 4. Create Enrichment Mockup Table (CargoWiseDB Sync Simulation)
        cursor.execute("""
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Jobs')
        BEGIN
            CREATE TABLE Jobs (
                JobNumber NVARCHAR(100) PRIMARY KEY,
                BillOfLading NVARCHAR(255),
                CustomerName NVARCHAR(255),
                Vessel NVARCHAR(255),
                DepartureDate DATETIME,
                ArrivalDate DATETIME
            );
            print('Created table: Jobs');
            
            -- Seed Mock Data for Enrichment Test
            INSERT INTO Jobs (JobNumber, BillOfLading, CustomerName, Vessel, DepartureDate)
            VALUES ('REAL-LOCAL-001', 'BOL-AAW-SQL-777', 'Premium Client AU', 'MSC ISABELLA', GETDATE());
            print('Seeded Jobs table with mock data.');
        END
        ELSE print('Table Jobs already exists.');
        """)

        conn.commit()
        print("Database initialization complete.")
        
    except Exception as e:
        print(f"Error initializing database: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    create_tables()
