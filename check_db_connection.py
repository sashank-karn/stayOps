"""
StayOps Database Connection Tester & Auto-Provisioner
-----------------------------------------------------
Use this script to test any database connection (including Supabase PostgreSQL,
Neon, Render Postgres, or local SQLite) and automatically provision all tables.

Usage:
  python check_db_connection.py
  OR
  python check_db_connection.py "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
"""
import sys
import os

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath("."))

def main():
    custom_url = sys.argv[1] if len(sys.argv) > 1 else None
    
    if custom_url:
        os.environ["DATABASE_URL"] = custom_url
        print(f"\n[Info] Testing custom database URL provided via command-line arguments...")
    else:
        print(f"\n[Info] Testing database URL configured in .env...")

    from backend.app.core.config import settings
    from backend.app.db.session import engine, Base, SessionLocal
    from sqlalchemy import text
    from backend.app.db.seed import seed_database
    from backend.app.models.property import Property, Room, Bed
    from backend.app.models.user import User

    db_url = settings.sqlalchemy_url
    # Hide password in output for security
    import re
    safe_url = re.sub(r':([^@]+)@', ':****@', db_url)
    print(f"[Target Engine URL] {safe_url}")

    print("\n1. Testing raw connection to database...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1;")).scalar()
            print(f"   [SUCCESS] Connected! Test query returned: {result}")
    except Exception as e:
        print(f"\n   [FAILED] Could not connect to database:")
        print(f"   Error: {e}")
        print("\n   [Supabase Troubleshooting Tip]:")
        print("   - In Supabase, go to Project Settings -> Database -> Connection string.")
        print("   - If connecting from local/IPv4 network, use 'Session' or 'Transaction' Pooler connection string.")
        print("   - Make sure your database password doesn't contain unencoded special characters (e.g. '@' -> '%40').")
        sys.exit(1)

    print("\n2. Provisioning StayOps schema (Base.metadata.create_all)...")
    try:
        Base.metadata.create_all(bind=engine)
        print("   [SUCCESS] All tables created or confirmed existing!")
    except Exception as e:
        print(f"   [ERROR] Schema creation failed: {e}")
        sys.exit(1)

    print("\n3. Seeding default tables and demo data...")
    try:
        db = SessionLocal()
        seed_result = seed_database(db)
        print(f"   [SUCCESS] Seeding complete! Status: {seed_result}")

        # Verify record counts
        prop_count = db.query(Property).count()
        room_count = db.query(Room).count()
        bed_count = db.query(Bed).count()
        user_count = db.query(User).count()

        print("\n==========================================")
        print("  StayOps Database Status Summary")
        print("==========================================")
        print(f"  • Properties: {prop_count}")
        print(f"  • Rooms:      {room_count}")
        print(f"  • Beds:       {bed_count}")
        print(f"  • Users:      {user_count}")
        print("==========================================")
        print("  Database is 100% READY for StayOps AI!")
        print("==========================================\n")
        db.close()
    except Exception as e:
        print(f"   [ERROR] Data verification failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
