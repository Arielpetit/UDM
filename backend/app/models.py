from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum


# ==================== ENUMS ====================

class MovementType(str, enum.Enum):
    """Types of stock movements"""
    RECEIVED = "received"       # Stock received from supplier
    SOLD = "sold"               # Stock sold to customer
    ADJUSTED = "adjusted"       # Manual adjustment (inventory count)
    RETURNED = "returned"       # Returned from customer
    DAMAGED = "damaged"         # Damaged/written off
    TRANSFERRED = "transferred" # Transferred to another location


class POStatus(str, enum.Enum):
    """Purchase Order status"""
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    ORDERED = "ordered"
    PARTIALLY_RECEIVED = "partially_received"
    RECEIVED = "received"
    CANCELLED = "cancelled"


# ==================== MODELS ====================

class Supplier(Base):
    """Supplier/Vendor model"""
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    contact_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    lead_time_days = Column(Integer, default=7)  # Average delivery time
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    items = relationship("InventoryItem", back_populates="supplier")
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")


class Location(Base):
    """Warehouse/Store location"""
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    address = Column(Text, nullable=True)
    is_default = Column(Integer, default=0)  # 1 for default location
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    item_locations = relationship("ItemLocation", back_populates="location")


class InventoryItem(Base):
    """Main inventory item model"""
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(100), unique=True, index=True, nullable=True)
    name = Column(String(255), index=True, nullable=False)
    description = Column(Text, nullable=True)
    quantity = Column(Integer, default=0)
    price = Column(Float, default=0.0)
    cost_price = Column(Float, default=0.0)  # What we pay for it
    category = Column(String(100), index=True)
    reorder_level = Column(Integer, default=10)
    
    # Supplier relationship
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    supplier = relationship("Supplier", back_populates="items")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    stock_movements = relationship("StockMovement", back_populates="item", cascade="all, delete-orphan")
    item_locations = relationship("ItemLocation", back_populates="item", cascade="all, delete-orphan")
    purchase_order_items = relationship("PurchaseOrderItem", back_populates="item")


class StockMovement(Base):
    """Audit trail for all stock quantity changes"""
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    
    quantity_change = Column(Integer, nullable=False)  # Positive for in, negative for out
    quantity_before = Column(Integer, nullable=False)
    quantity_after = Column(Integer, nullable=False)
    
    movement_type = Column(String(50), nullable=False)  # MovementType enum value
    reason = Column(Text, nullable=True)
    reference_number = Column(String(100), nullable=True)  # e.g., PO number, invoice
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(String(255), nullable=True)  # User who made the change
    
    # Relationships
    item = relationship("InventoryItem", back_populates="stock_movements")


class ItemLocation(Base):
    """Stock quantity per location (multi-location support)"""
    __tablename__ = "item_locations"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    quantity = Column(Integer, default=0)
    
    # Relationships
    item = relationship("InventoryItem", back_populates="item_locations")
    location = relationship("Location", back_populates="item_locations")


class PurchaseOrder(Base):
    """Purchase orders to suppliers"""
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(50), unique=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    
    status = Column(String(50), default=POStatus.DRAFT.value)
    total_amount = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    
    expected_delivery = Column(DateTime(timezone=True), nullable=True)
    received_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    supplier = relationship("Supplier", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")


class PurchaseOrderItem(Base):
    """Line items in a purchase order"""
    __tablename__ = "purchase_order_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    
    quantity_ordered = Column(Integer, nullable=False)
    quantity_received = Column(Integer, default=0)
    unit_price = Column(Float, nullable=False)
    
    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    item = relationship("InventoryItem", back_populates="purchase_order_items")


class AlertConfig(Base):
    """Email alert configuration"""
    __tablename__ = "alert_configs"

    id = Column(Integer, primary_key=True, index=True)
    email_recipients = Column(Text, nullable=True)  # Comma-separated emails
    low_stock_enabled = Column(Integer, default=1)  # 1=enabled, 0=disabled
    out_of_stock_enabled = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())



