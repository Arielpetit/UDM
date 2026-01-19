import os
import io
import csv
import uuid
import redis
from sqlalchemy import text
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func as sql_func
from typing import List, Optional
from datetime import datetime

from . import models, schemas, ai_service
from .database import engine, get_db
from fastapi.middleware.cors import CORSMiddleware

# Create all tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Inventory Tracker API", version="2.0.0")

# Initialize Redis
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
try:
    redis_client = redis.from_url(redis_url)
except Exception:
    redis_client = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)





def invalidate_cache():
    """Helper to invalidate Redis cache"""
    if redis_client:
        try:
            for key in redis_client.scan_iter("items:*"):
                redis_client.delete(key)
        except Exception:
            pass







# ==================== HEALTH CHECK ====================

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {str(e)}"

    redis_status = "ok"
    if redis_client:
        try:
            redis_client.ping()
        except Exception as e:
            redis_status = f"error: {str(e)}"
    else:
        redis_status = "not configured"

    return {"db": db_status, "redis": redis_status}


# ==================== INVENTORY ITEMS ====================

@app.get("/items/", response_model=List[schemas.InventoryItem])
def read_items(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    category: Optional[str] = None,
    low_stock_only: bool = False,
    supplier_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.InventoryItem).options(joinedload(models.InventoryItem.supplier))

    if search:
        query = query.filter(
            models.InventoryItem.name.ilike(f"%{search}%") |
            models.InventoryItem.sku.ilike(f"%{search}%")
        )
    if category:
        query = query.filter(models.InventoryItem.category == category)
    if low_stock_only:
        query = query.filter(models.InventoryItem.quantity <= models.InventoryItem.reorder_level)
    if supplier_id:
        query = query.filter(models.InventoryItem.supplier_id == supplier_id)

    return query.offset(skip).limit(limit).all()


@app.post("/items/", response_model=schemas.InventoryItem)
def create_item(
    item: schemas.InventoryItemCreate, 
    db: Session = Depends(get_db)
):
    db_item = models.InventoryItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    # Create initial stock movement
    if item.quantity > 0:
        movement = models.StockMovement(
            item_id=db_item.id,
            quantity_change=item.quantity,
            quantity_before=0,
            quantity_after=item.quantity,
            movement_type=schemas.MovementType.RECEIVED.value,
            reason="Initial stock"
        )
        db.add(movement)
        db.commit()

    invalidate_cache()
    return db_item


@app.get("/items/{item_id}", response_model=schemas.InventoryItem)
def read_item(
    item_id: int, 
    db: Session = Depends(get_db)
):
    db_item = db.query(models.InventoryItem).options(
        joinedload(models.InventoryItem.supplier)
    ).filter(models.InventoryItem.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return db_item


@app.put("/items/{item_id}", response_model=schemas.InventoryItem)
def update_item(
    item_id: int,
    item: schemas.InventoryItemUpdate,
    movement_reason: Optional[str] = None,
    db: Session = Depends(get_db)
):
    db_item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    old_quantity = db_item.quantity
    item_data = item.model_dump(exclude_unset=True)

    for key, value in item_data.items():
        setattr(db_item, key, value)

    # Track quantity change
    if "quantity" in item_data and item_data["quantity"] != old_quantity:
        change = item_data["quantity"] - old_quantity
        movement = models.StockMovement(
            item_id=item_id,
            quantity_change=change,
            quantity_before=old_quantity,
            quantity_after=item_data["quantity"],
            movement_type=schemas.MovementType.ADJUSTED.value,
            reason=movement_reason or "Manual adjustment"
        )
        db.add(movement)

    db.commit()
    db.refresh(db_item)
    invalidate_cache()
    return db_item


@app.delete("/items/{item_id}")
def delete_item(
    item_id: int, 
    db: Session = Depends(get_db)
):
    db_item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(db_item)
    db.commit()
    invalidate_cache()
    return {"message": "Item deleted"}


# ==================== STOCK MOVEMENTS ====================

@app.get("/items/{item_id}/movements", response_model=List[schemas.StockMovement])
def get_item_movements(
    item_id: int, 
    limit: int = 50, 
    db: Session = Depends(get_db)
):
    """Get stock movement history for an item"""
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    movements = db.query(models.StockMovement).filter(
        models.StockMovement.item_id == item_id
    ).order_by(models.StockMovement.created_at.desc()).limit(limit).all()

    return movements


@app.post("/items/{item_id}/movements", response_model=schemas.StockMovement)
def create_movement(
    item_id: int,
    movement: schemas.StockMovementCreate,
    db: Session = Depends(get_db)
):
    """Create a stock movement (adjusts quantity automatically)"""
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    old_quantity = item.quantity
    new_quantity = old_quantity + movement.quantity_change

    if new_quantity < 0:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    # Update item quantity
    item.quantity = new_quantity

    # Create movement record
    db_movement = models.StockMovement(
        item_id=item_id,
        quantity_change=movement.quantity_change,
        quantity_before=old_quantity,
        quantity_after=new_quantity,
        movement_type=movement.movement_type.value,
        reason=movement.reason,
        reference_number=movement.reference_number
    )
    db.add(db_movement)
    db.commit()
    db.refresh(db_movement)

    invalidate_cache()
    return db_movement


# ==================== SUPPLIERS ====================

@app.get("/suppliers/", response_model=List[schemas.Supplier])
def read_suppliers(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    return db.query(models.Supplier).offset(skip).limit(limit).all()


@app.post("/suppliers/", response_model=schemas.Supplier)
def create_supplier(
    supplier: schemas.SupplierCreate, 
    db: Session = Depends(get_db)
):
    db_supplier = models.Supplier(**supplier.model_dump())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier


@app.get("/suppliers/{supplier_id}", response_model=schemas.Supplier)
def read_supplier(
    supplier_id: int, 
    db: Session = Depends(get_db)
):
    supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@app.put("/suppliers/{supplier_id}", response_model=schemas.Supplier)
def update_supplier(
    supplier_id: int, 
    supplier: schemas.SupplierUpdate, 
    db: Session = Depends(get_db)
):
    db_supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    for key, value in supplier.model_dump(exclude_unset=True).items():
        setattr(db_supplier, key, value)

    db.commit()
    db.refresh(db_supplier)
    return db_supplier


@app.delete("/suppliers/{supplier_id}")
def delete_supplier(
    supplier_id: int, 
    db: Session = Depends(get_db)
):
    supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    db.delete(supplier)
    db.commit()
    return {"message": "Supplier deleted"}


# ==================== LOCATIONS ====================

@app.get("/locations/", response_model=List[schemas.Location])
def read_locations(
    db: Session = Depends(get_db)
):
    return db.query(models.Location).all()


@app.post("/locations/", response_model=schemas.Location)
def create_location(location: schemas.LocationCreate, db: Session = Depends(get_db)):
    db_location = models.Location(**location.model_dump())
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location


# ==================== PURCHASE ORDERS ====================

def generate_po_number():
    return f"PO-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


@app.get("/purchase-orders/", response_model=List[schemas.PurchaseOrder])
def read_purchase_orders(
    status: Optional[str] = None,
    supplier_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.PurchaseOrder).options(
        joinedload(models.PurchaseOrder.supplier),
        joinedload(models.PurchaseOrder.items)
    )
    if status:
        query = query.filter(models.PurchaseOrder.status == status)
    if supplier_id:
        query = query.filter(models.PurchaseOrder.supplier_id == supplier_id)
    return query.order_by(models.PurchaseOrder.created_at.desc()).all()


@app.post("/purchase-orders/", response_model=schemas.PurchaseOrder)
def create_purchase_order(
    po: schemas.PurchaseOrderCreate, 
    db: Session = Depends(get_db)
):
    # Calculate total
    total = sum(item.quantity_ordered * item.unit_price for item in po.items)

    db_po = models.PurchaseOrder(
        po_number=generate_po_number(),
        supplier_id=po.supplier_id,
        notes=po.notes,
        expected_delivery=po.expected_delivery,
        total_amount=total,
        status=schemas.POStatus.DRAFT.value
    )
    db.add(db_po)
    db.flush()

    # Add items
    for item in po.items:
        po_item = models.PurchaseOrderItem(
            purchase_order_id=db_po.id,
            item_id=item.item_id,
            quantity_ordered=item.quantity_ordered,
            unit_price=item.unit_price
        )
        db.add(po_item)

    db.commit()
    db.refresh(db_po)
    return db_po


@app.put("/purchase-orders/{po_id}", response_model=schemas.PurchaseOrder)
def update_purchase_order(
    po_id: int, 
    po: schemas.PurchaseOrderUpdate, 
    db: Session = Depends(get_db)
):
    db_po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if not db_po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    for key, value in po.model_dump(exclude_unset=True).items():
        if key == "status" and value:
            setattr(db_po, key, value.value)
        else:
            setattr(db_po, key, value)

    db.commit()
    db.refresh(db_po)
    return db_po


@app.post("/purchase-orders/{po_id}/receive")
def receive_purchase_order(
    po_id: int, 
    db: Session = Depends(get_db)
):
    """Mark PO as received and update inventory"""
    db_po = db.query(models.PurchaseOrder).options(
        joinedload(models.PurchaseOrder.items)
    ).filter(models.PurchaseOrder.id == po_id).first()

    if not db_po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    # Update each item's stock
    for po_item in db_po.items:
        item = db.query(models.InventoryItem).filter(models.InventoryItem.id == po_item.item_id).first()
        if item:
            old_qty = item.quantity
            item.quantity += po_item.quantity_ordered
            po_item.quantity_received = po_item.quantity_ordered

            # Create movement
            movement = models.StockMovement(
                item_id=item.id,
                quantity_change=po_item.quantity_ordered,
                quantity_before=old_qty,
                quantity_after=item.quantity,
                movement_type=schemas.MovementType.RECEIVED.value,
                reason=f"Received from PO {db_po.po_number}",
                reference_number=db_po.po_number
            )
            db.add(movement)

    db_po.status = schemas.POStatus.RECEIVED.value
    db_po.received_at = datetime.utcnow()
    db.commit()
    invalidate_cache()

    return {"message": "Purchase order received", "po_number": db_po.po_number}


# ==================== IMPORT / EXPORT ====================

@app.get("/items/export/csv")
def export_items_csv(
    db: Session = Depends(get_db)
):
    """Export all items as CSV"""
    items = db.query(models.InventoryItem).options(
        joinedload(models.InventoryItem.supplier)
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "SKU", "Name", "Description", "Quantity", "Price", "Cost Price",
        "Category", "Reorder Level", "Supplier"
    ])

    # Data
    for item in items:
        writer.writerow([
            item.sku or "",
            item.name,
            item.description or "",
            item.quantity,
            item.price,
            item.cost_price,
            item.category,
            item.reorder_level,
            item.supplier.name if item.supplier else ""
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=inventory_export.csv"}
    )


@app.post("/items/import/csv")
async def import_items_csv(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    """Import items from CSV"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))

    imported = 0
    errors = []

    for row_num, row in enumerate(reader, start=2):
        try:
            # Find supplier if provided
            supplier_id = None
            if row.get("Supplier"):
                supplier = db.query(models.Supplier).filter(
                    models.Supplier.name == row["Supplier"]
                ).first()
                if supplier:
                    supplier_id = supplier.id

            # Check if SKU exists
            existing = None
            if row.get("SKU"):
                existing = db.query(models.InventoryItem).filter(
                    models.InventoryItem.sku == row["SKU"]
                ).first()

            if existing:
                # Update existing
                existing.name = row["Name"]
                existing.description = row.get("Description", "")
                existing.quantity = int(row.get("Quantity", 0))
                existing.price = float(row.get("Price", 0))
                existing.cost_price = float(row.get("Cost Price", 0))
                existing.category = row.get("Category", "General")
                existing.reorder_level = int(row.get("Reorder Level", 10))
                existing.supplier_id = supplier_id
            else:
                # Create new
                item = models.InventoryItem(
                    sku=row.get("SKU") or None,
                    name=row["Name"],
                    description=row.get("Description", ""),
                    quantity=int(row.get("Quantity", 0)),
                    price=float(row.get("Price", 0)),
                    cost_price=float(row.get("Cost Price", 0)),
                    category=row.get("Category", "General"),
                    reorder_level=int(row.get("Reorder Level", 10)),
                    supplier_id=supplier_id
                )
                db.add(item)

            imported += 1
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")

    db.commit()
    invalidate_cache()

    return {
        "imported": imported,
        "errors": errors[:10]  # Return first 10 errors
    }


# ==================== ANALYTICS ====================

@app.get("/stats", response_model=schemas.DashboardStats)
def get_stats(
    db: Session = Depends(get_db)
):
    """Get dashboard statistics"""
    total_items = db.query(sql_func.count(models.InventoryItem.id)).scalar() or 0
    total_quantity = db.query(sql_func.sum(models.InventoryItem.quantity)).scalar() or 0
    total_value = db.query(
        sql_func.sum(models.InventoryItem.quantity * models.InventoryItem.price)
    ).scalar() or 0.0

    low_stock_count = db.query(sql_func.count(models.InventoryItem.id)).filter(
        models.InventoryItem.quantity <= models.InventoryItem.reorder_level,
        models.InventoryItem.quantity > 0
    ).scalar() or 0

    out_of_stock_count = db.query(sql_func.count(models.InventoryItem.id)).filter(
        models.InventoryItem.quantity == 0
    ).scalar() or 0

    return schemas.DashboardStats(
        total_items=total_items,
        total_quantity=total_quantity,
        total_value=round(total_value, 2),
        low_stock_count=low_stock_count,
        out_of_stock_count=out_of_stock_count
    )


@app.get("/categories")
def get_categories(
    db: Session = Depends(get_db)
):
    """Get all unique categories"""
    categories = db.query(models.InventoryItem.category).distinct().all()
    return [c[0] for c in categories if c[0]]


@app.get("/analytics/categories", response_model=List[schemas.CategoryBreakdown])
def get_category_analytics(
    db: Session = Depends(get_db)
):
    """Get breakdown by category"""
    results = db.query(
        models.InventoryItem.category,
        sql_func.count(models.InventoryItem.id).label("item_count"),
        sql_func.sum(models.InventoryItem.quantity * models.InventoryItem.price).label("total_value"),
        sql_func.sum(models.InventoryItem.quantity).label("total_quantity")
    ).group_by(models.InventoryItem.category).all()

    return [
        schemas.CategoryBreakdown(
            category=r.category or "Uncategorized",
            item_count=r.item_count,
            total_value=round(r.total_value or 0, 2),
            total_quantity=r.total_quantity or 0
        )
        for r in results
    ]


@app.get("/analytics/top-items")
def get_top_items(
    limit: int = 10, 
    db: Session = Depends(get_db)
):
    """Get top items by value"""
    items = db.query(models.InventoryItem).order_by(
        (models.InventoryItem.quantity * models.InventoryItem.price).desc()
    ).limit(limit).all()

    return [
        {
            "id": item.id,
            "name": item.name,
            "quantity": item.quantity,
            "price": item.price,
            "total_value": round(item.quantity * item.price, 2)
        }
        for item in items
    ]


@app.get("/analytics/low-stock")
def get_low_stock_items(
    db: Session = Depends(get_db)
):
    """Get all low stock items with details"""
    items = db.query(models.InventoryItem).options(
        joinedload(models.InventoryItem.supplier)
    ).filter(
        models.InventoryItem.quantity <= models.InventoryItem.reorder_level
    ).all()

    return [
        {
            "id": item.id,
            "name": item.name,
            "sku": item.sku,
            "quantity": item.quantity,
            "reorder_level": item.reorder_level,
            "supplier": item.supplier.name if item.supplier else None,
            "supplier_id": item.supplier_id
        }
        for item in items
    ]


# ==================== ALERT CONFIGURATION ====================

@app.get("/alerts/config", response_model=schemas.AlertConfig)
def get_alert_config(
    db: Session = Depends(get_db)
):
    """Get alert configuration"""
    config = db.query(models.AlertConfig).first()
    if not config:
        config = models.AlertConfig()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@app.put("/alerts/config", response_model=schemas.AlertConfig)
def update_alert_config(
    config: schemas.AlertConfigUpdate, 
    db: Session = Depends(get_db)
):
    """Update alert configuration"""
    db_config = db.query(models.AlertConfig).first()
    if not db_config:
        db_config = models.AlertConfig()
        db.add(db_config)

    for key, value in config.model_dump(exclude_unset=True).items():
        setattr(db_config, key, value)

    db.commit()
    db.refresh(db_config)
    return db_config


# ==================== AI ASSISTANT ====================

class ChatRequest(schemas.BaseModel):
    message: str

@app.post("/ai/chat")
async def ai_chat(request: ChatRequest, db: Session = Depends(get_db)):
    """AI Assistant endpoint that provides analysis based on current data"""
    
    # Gather context data
    total_items = db.query(models.InventoryItem).count()
    low_stock = db.query(models.InventoryItem).filter(
        models.InventoryItem.quantity <= models.InventoryItem.reorder_level
    ).all()
    
    top_items = db.query(models.InventoryItem).order_by(
        (models.InventoryItem.quantity * models.InventoryItem.price).desc()
    ).limit(5).all()
    
    recent_movements = db.query(models.StockMovement).order_by(
        models.StockMovement.created_at.desc()
    ).limit(10).all()

    context = {
        "summary": {
            "total_items": total_items,
            "low_stock_count": len(low_stock),
        },
        "low_stock_items": [
            {"name": i.name, "sku": i.sku, "quantity": i.quantity, "reorder_level": i.reorder_level}
            for i in low_stock
        ],
        "top_value_items": [
            {"name": i.name, "value": i.quantity * i.price}
            for i in top_items
        ],
        "recent_activity": [
            {"item": m.item.name if m.item else "Unknown", "change": m.quantity_change, "type": m.movement_type}
            for m in recent_movements
        ]
    }

    response_text = await ai_service.ai_service.get_chat_response(request.message, context)
    return {"response": response_text}
