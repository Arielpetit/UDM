import os
import redis
from sqlalchemy import text
import json
from fastapi import FastAPI, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from typing import List
from . import models, schemas, database
from .database import engine, get_db
from fastapi.middleware.cors import CORSMiddleware

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Inventory Tracker API")

# Initialize Redis
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.from_url(redis_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/items/", response_model=List[schemas.InventoryItem])
def read_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Try to get from Redis cache
    cache_key = f"items:{skip}:{limit}"
    try:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
    except Exception as e:
        print(f"Redis error: {e}")

    items = db.query(models.InventoryItem).offset(skip).limit(limit).all()
    
    # Save to Redis (expire in 60 seconds)
    try:
        redis_client.setex(cache_key, 60, json.dumps(jsonable_encoder(items)))
    except Exception as e:
        print(f"Redis set error: {e}")
        
    return items

@app.post("/items/", response_model=schemas.InventoryItem)
def create_item(item: schemas.InventoryItemCreate, db: Session = Depends(get_db)):
    db_item = models.InventoryItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    
    # Invalidate cache
    try:
        for key in redis_client.scan_iter("items:*"):
            redis_client.delete(key)
    except Exception:
        pass

    return db_item

@app.get("/items/{item_id}", response_model=schemas.InventoryItem)
def read_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return db_item

@app.put("/items/{item_id}", response_model=schemas.InventoryItem)
def update_item(item_id: int, item: schemas.InventoryItemUpdate, db: Session = Depends(get_db)):
    db_item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item_data = item.model_dump(exclude_unset=True)
    for key, value in item_data.items():
        setattr(db_item, key, value)
    
    db.commit()
    db.refresh(db_item)

    # Invalidate cache
    try:
        for key in redis_client.scan_iter("items:*"):
            redis_client.delete(key)
    except Exception:
        pass

    return db_item

@app.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(db_item)
    db.commit()
    db.commit()
    
    # Invalidate cache
    try:
        for key in redis_client.scan_iter("items:*"):
            redis_client.delete(key)
    except Exception:
        pass

    return {"message": "Item deleted"}

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    # Check DB
    try:
        db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {str(e)}"

    # Check Redis
    try:
        redis_client.ping()
        redis_status = "ok"
    except Exception as e:
        redis_status = f"error: {str(e)}"
        
    return {"db": db_status, "redis": redis_status}
