import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL_BASE = os.getenv("DATABASE_URL", "postgresql://user@db:5432/inventory")
PASSWORD_FILE_PATH = os.getenv("POSTGRES_PASSWORD_FILE")

if PASSWORD_FILE_PATH and os.path.exists(PASSWORD_FILE_PATH):
    with open(PASSWORD_FILE_PATH, 'r') as f:
        password = f.read().strip()
    
    # Correctly insert the password into the URL
    # postgresql://user:password@db:5432/inventory
    parts = DATABASE_URL_BASE.split('://')
    user_part = parts[1].split('@')[0]
    db_part = parts[1].split('@')[1]
    DATABASE_URL = f"{parts[0]}://{user_part}:{password}@{db_part}"
else:
    # Fallback for local development without secrets
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/inventory")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
