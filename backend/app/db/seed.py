"""Database seeder populating realistic PG properties, rooms, beds, tenants, vendors, and leads."""
from datetime import date, datetime, timedelta, timezone
from sqlalchemy.orm import Session
from backend.app.db.session import SessionLocal, Base, engine
from backend.app.models.property import Property, Room, Bed
from backend.app.models.tenant import Tenant, Lease
from backend.app.models.lead import Lead, PropertyVisit
from backend.app.models.maintenance import Vendor, MaintenanceTicket
from backend.app.models.financial import RentRecord, PaymentTransaction


def seed_database(db: Session | None = None) -> dict[str, int]:
    """Seed comprehensive initial sample data into the database."""
    # Ensure tables exist
    close_after = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_after = True
    else:
        Base.metadata.create_all(bind=db.get_bind())

    try:
        # Check if already seeded
        if db.query(Property).first():
            return {"status": "already_seeded"}

        # 1. Properties
        p1 = Property(
            name="StayOps TechPG - Koramangala",
            code="SO-BLR-KOR",
            address="45, 5th Cross, 4th Block, Koramangala",
            city="Bengaluru",
            state="Karnataka",
            pincode="560034",
            total_floors=3,
            rules_summary="Gate closes at 11:00 PM. No loud music after 10 PM. Non-resident visitors allowed until 8 PM. Smoking strictly prohibited.",
            amenities=["High-Speed 200Mbps Wi-Fi", "Daily Room Cleaning", "3 Times North/South Meal", "RO Purifier", "Power Backup 24/7"],
            manager_name="Rajesh Sharma",
            manager_phone="+919876500001",
            manager_email="rajesh.blr@stayops.ai",
        )

        p2 = Property(
            name="StayOps CampusLiving - Viman Nagar",
            code="SO-PUN-VIM",
            address="Plot 12, Dutta Mandir Road, Viman Nagar",
            city="Pune",
            state="Maharashtra",
            pincode="411014",
            total_floors=4,
            rules_summary="Gate curfew 11:30 PM. Biometric attendance. Quiet study hours 9 PM-7 AM. No smoking or alcohol in premises.",
            amenities=["High-Speed Wi-Fi", "Laundromat", "Daily Housekeeping", "CCTV Security", "Study Lounge", "Mess Service"],
            manager_name="Amit Deshmukh",
            manager_phone="+919876500002",
            manager_email="amit.pun@stayops.ai",
        )
        db.add_all([p1, p2])
        db.flush()

        # 2. Rooms & Beds for Koramangala
        r101 = Room(property_id=p1.id, room_number="101", floor_number=1, room_type="Single", base_rent=16000.0, is_available=False)
        r102 = Room(property_id=p1.id, room_number="102", floor_number=1, room_type="Double", base_rent=11000.0, is_available=False)
        r201 = Room(property_id=p1.id, room_number="201", floor_number=2, room_type="Double", base_rent=11000.0, is_available=True)
        db.add_all([r101, r102, r201])
        db.flush()

        b101_a = Bed(room_id=r101.id, bed_label="A", status="occupied", monthly_rent=16000.0)
        b102_a = Bed(room_id=r102.id, bed_label="A", status="occupied", monthly_rent=11000.0)
        b102_b = Bed(room_id=r102.id, bed_label="B", status="occupied", monthly_rent=11000.0)
        b201_a = Bed(room_id=r201.id, bed_label="A", status="available", monthly_rent=11000.0)
        b201_b = Bed(room_id=r201.id, bed_label="B", status="available", monthly_rent=11000.0)
        db.add_all([b101_a, b102_a, b102_b, b201_a, b201_b])

        # Rooms & Beds for Viman Nagar
        r_vim_1 = Room(property_id=p2.id, room_number="A-101", floor_number=1, room_type="Double", base_rent=9500.0, is_available=False)
        r_vim_2 = Room(property_id=p2.id, room_number="A-201", floor_number=2, room_type="Triple", base_rent=7500.0, is_available=True)
        db.add_all([r_vim_1, r_vim_2])
        db.flush()

        b_vim_1a = Bed(room_id=r_vim_1.id, bed_label="1", status="occupied", monthly_rent=9500.0)
        b_vim_1b = Bed(room_id=r_vim_1.id, bed_label="2", status="occupied", monthly_rent=9500.0)
        b_vim_2a = Bed(room_id=r_vim_2.id, bed_label="1", status="occupied", monthly_rent=7500.0)
        b_vim_2b = Bed(room_id=r_vim_2.id, bed_label="2", status="available", monthly_rent=7500.0)
        b_vim_2c = Bed(room_id=r_vim_2.id, bed_label="3", status="available", monthly_rent=7500.0)
        db.add_all([b_vim_1a, b_vim_1b, b_vim_2a, b_vim_2b, b_vim_2c])
        db.flush()

        # 3. Tenants & Leases
        today = date.today()

        # Tenant 1: Rohan Mehta in 101-A (Will be used for 15-day move-out demonstration!)
        t1 = Tenant(
            full_name="Rohan Mehta",
            email="rohan.mehta@example.com",
            phone="+919811100001",
            emergency_contact="+919811199991",
            id_proof_type="Aadhaar",
            id_proof_number="4321-8765-1122",
            status="active",
        )
        # Tenant 2: Sneha Patil in 102-A
        t2 = Tenant(
            full_name="Sneha Patil",
            email="sneha.patil@example.com",
            phone="+919811100002",
            emergency_contact="+919811199992",
            id_proof_type="Passport",
            id_proof_number="Z8765432",
            status="active",
        )
        # Tenant 3: Vikram Reddy in 102-B (Has pending overdue rent!)
        t3 = Tenant(
            full_name="Vikram Reddy",
            email="vikram.reddy@example.com",
            phone="+919811100003",
            emergency_contact="+919811199993",
            id_proof_type="Aadhaar",
            id_proof_number="9876-1234-5678",
            status="active",
        )
        # Tenant 4: Ananya Iyer in Viman Nagar A-101-1
        t4 = Tenant(
            full_name="Ananya Iyer",
            email="ananya.iyer@example.com",
            phone="+919811100004",
            emergency_contact="+919811199994",
            id_proof_type="Aadhaar",
            id_proof_number="5544-3322-1100",
            status="active",
        )
        db.add_all([t1, t2, t3, t4])
        db.flush()

        # Leases
        l1 = Lease(tenant_id=t1.id, bed_id=b101_a.id, start_date=today - timedelta(days=120), monthly_rent=16000.0, security_deposit=32000.0, status="active")
        l2 = Lease(tenant_id=t2.id, bed_id=b102_a.id, start_date=today - timedelta(days=90), monthly_rent=11000.0, security_deposit=22000.0, status="active")
        l3 = Lease(tenant_id=t3.id, bed_id=b102_b.id, start_date=today - timedelta(days=60), monthly_rent=11000.0, security_deposit=22000.0, status="active")
        l4 = Lease(tenant_id=t4.id, bed_id=b_vim_1a.id, start_date=today - timedelta(days=45), monthly_rent=9500.0, security_deposit=19000.0, status="active")
        db.add_all([l1, l2, l3, l4])
        db.flush()

        # 4. Rent Records & Payments
        curr_month_str = today.strftime("%Y-%m")
        prev_month = today.replace(day=1) - timedelta(days=1)
        prev_month_str = prev_month.strftime("%Y-%m")

        # Rohan Mehta (t1): Current month paid in full!
        rr1 = RentRecord(lease_id=l1.id, tenant_id=t1.id, billing_month=curr_month_str, due_date=today.replace(day=5), amount_due=16000.0, amount_paid=16000.0, status="paid", days_overdue=0)
        p_t1 = PaymentTransaction(tenant_id=t1.id, lease_id=l1.id, rent_record_id=rr1.id, amount=16000.0, payment_type="Rent", status="paid", payment_method="UPI", reference_id="UPI-ROH-991")

        # Vikram Reddy (t3): Current month is OVERDUE by 6 days!
        rr3 = RentRecord(lease_id=l3.id, tenant_id=t3.id, billing_month=curr_month_str, due_date=today.replace(day=5), amount_due=11000.0, amount_paid=0.0, status="overdue", days_overdue=6)

        db.add_all([rr1, p_t1, rr3])
        db.flush()

        # 5. Vendors
        v_plumber = Vendor(name="FastFlow Plumbing Services", category="Plumbing", phone="+919822211101", email="fastflow@vendors.local", rating=4.8, hourly_rate=450.0)
        v_electric = Vendor(name="Spark Electricals & Solar", category="Electrical", phone="+919822211102", email="spark@vendors.local", rating=4.6, hourly_rate=500.0)
        v_cleaning = Vendor(name="CleanPro Deep Cleaning & Turnover", category="Cleaning", phone="+919822211103", email="cleanpro@vendors.local", rating=4.9, hourly_rate=600.0)
        v_appliance = Vendor(name="FixIt All Appliances (RO/AC/Geyser)", category="Appliance", phone="+919822211104", email="fixit@vendors.local", rating=4.7, hourly_rate=550.0)
        db.add_all([v_plumber, v_electric, v_cleaning, v_appliance])
        db.flush()

        # 6. Leads (Prospective tenants looking for rooms!)
        lead1 = Lead(
            full_name="Kavya Nair",
            phone="+919833300001",
            email="kavya.nair@example.com",
            budget=16500.0,
            preferred_location="Bengaluru",
            preferred_room_type="Single",
            move_in_date=today + timedelta(days=15),  # Perfect match for Rohan Mehta's upcoming single room vacancy!
            status="new",
            source="website",
            notes="Tech professional joining Koramangala startup. Looking for single room immediately.",
        )
        lead2 = Lead(
            full_name="Arjun Varma",
            phone="+919833300002",
            email="arjun.varma@example.com",
            budget=12000.0,
            preferred_location="Bengaluru",
            preferred_room_type="Double",
            move_in_date=today + timedelta(days=20),
            status="contacted",
            source="referral",
            notes="Prefers 1st floor, needs meal option.",
        )
        lead3 = Lead(
            full_name="Pooja Kulkarni",
            phone="+919833300003",
            email="pooja.k@example.com",
            budget=9500.0,
            preferred_location="Pune",
            preferred_room_type="Double",
            move_in_date=today + timedelta(days=10),
            status="new",
            source="walk_in",
            notes="Student at Symbiosis Viman Nagar.",
        )
        db.add_all([lead1, lead2, lead3])

        # 7. Past Tickets
        ticket1 = MaintenanceTicket(
            property_id=p1.id,
            room_id=r102.id,
            tenant_id=t2.id,
            vendor_id=v_plumber.id,
            title="Slow drainage in washroom sink",
            description="Bathroom basin water is taking too long to drain.",
            category="Plumbing",
            severity="Medium",
            status="resolved",
            estimated_cost=600.0,
            actual_cost=550.0,
            resolution_notes="Trap cleared and pipe resealed.",
            resolved_at=datetime.now(timezone.utc) - timedelta(days=2),
        )
        db.add(ticket1)

        db.commit()
        return {
            "properties": 2,
            "rooms": 5,
            "beds": 10,
            "tenants": 4,
            "vendors": 4,
            "leads": 3,
        }
    except Exception:
        db.rollback()
        raise
    finally:
        if close_after:
            db.close()


if __name__ == "__main__":
    result = seed_database()
    print("Seed result:", result)
