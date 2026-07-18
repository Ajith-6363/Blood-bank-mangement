import asyncio
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.models.user import User
from app.models.stock import BloodStock
from app.core.security import get_password_hash
from app.api.v1.api import api_router
from app.background_tasks import start_periodic_scheduler

logger = logging.getLogger("main")
logging.basicConfig(level=logging.INFO)

def seed_database(db: Session):
    # Check if we already have an admin
    admin_exists = db.query(User).filter(User.role == "admin").first()
    if admin_exists:
        return

    logger.info("Database is empty. Seeding initial development data...")
    
    # 1. Create Default Users
    users_to_seed = [
        {
            "email": "admin@bloodbank.com",
            "password": "AdminPass123",
            "full_name": "Dr. Sarah Miller",
            "role": "admin",
            "phone": "+15550100",
            "address": "LifeLink HQ, Suite 100",
            "blood_group": None,
            "is_verified": True
        },
        {
            "email": "donor@bloodbank.com",
            "password": "DonorPass123",
            "full_name": "John Doe",
            "role": "donor",
            "phone": "+15550101",
            "address": "456 Oak Lane, Metropolis",
            "blood_group": "O-",
            "is_verified": True
        },
        {
            "email": "hospital@bloodbank.com",
            "password": "HospitalPass123",
            "full_name": "City General Hospital",
            "role": "hospital",
            "phone": "+15550199",
            "address": "789 Health Blvd, Metropolis",
            "blood_group": None,
            "is_verified": True
        },
        {
            "email": "recipient@bloodbank.com",
            "password": "RecipientPass123",
            "full_name": "Robert Smith",
            "role": "recipient",
            "phone": "+15550102",
            "address": "12 Pine Rd, Metropolis",
            "blood_group": "A+",
            "is_verified": True
        },
        {
            "email": "volunteer@bloodbank.com",
            "password": "VolunteerPass123",
            "full_name": "Alice Green",
            "role": "volunteer",
            "phone": "+15550155",
            "address": "78 Spruce St, Metropolis",
            "blood_group": "B+",
            "is_verified": True
        }
    ]

    for u in users_to_seed:
        new_user = User(
            email=u["email"],
            hashed_password=get_password_hash(u["password"]),
            full_name=u["full_name"],
            role=u["role"],
            phone=u["phone"],
            address=u["address"],
            blood_group=u["blood_group"],
            is_active=True,
            is_verified=u["is_verified"]
        )
        db.add(new_user)
    
    db.commit()

    # 2. Create Initial Blood Stock Batches
    today = date.today()
    batches = [
        {"bg": "O-", "qty": 12, "loc": "Fridge A, Shelf 1", "days_ago": 10, "exp_days": 32},
        {"bg": "O+", "qty": 18, "loc": "Fridge A, Shelf 2", "days_ago": 5, "exp_days": 37},
        {"bg": "A+", "qty": 15, "loc": "Fridge B, Shelf 1", "days_ago": 12, "exp_days": 30},
        {"bg": "A-", "qty": 8, "loc": "Fridge B, Shelf 2", "days_ago": 2, "exp_days": 40},
        {"bg": "B+", "qty": 10, "loc": "Fridge C, Shelf 1", "days_ago": 20, "exp_days": 22},
        {"bg": "B-", "qty": 4, "loc": "Fridge C, Shelf 2", "days_ago": 1, "exp_days": 41},
        {"bg": "AB+", "qty": 6, "loc": "Fridge D, Shelf 1", "days_ago": 15, "exp_days": 27},
        {"bg": "AB-", "qty": 3, "loc": "Fridge D, Shelf 2", "days_ago": 18, "exp_days": 24},
    ]

    for b in batches:
        batch_num = f"BB-{b['bg'].replace('+', 'P').replace('-', 'M')}-SEED{b['days_ago']}"
        stock = BloodStock(
            batch_number=batch_num,
            blood_group=b["bg"],
            quantity=b["qty"],
            collection_date=today - timedelta(days=b["days_ago"]),
            expiry_date=today + timedelta(days=b["exp_days"]),
            storage_location=b["loc"],
            status="available"
        )
        db.add(stock)
    
    db.commit()
    logger.info("Database seeding completed.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables for any configured database (including PostgreSQL) on startup
    logger.info("Ensuring database tables are initialized...")
    Base.metadata.create_all(bind=engine)
        
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
        
    # Start background scheduler loop
    scheduler_task = asyncio.create_task(start_periodic_scheduler())
    
    yield
    
    # Cancel background task on shutdown
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        logger.info("Background scheduler shut down successfully.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the combined router under the V1 prefix
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs"
    }
