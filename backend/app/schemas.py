from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ==================== ENUMS ====================

class MovementType(str, Enum):
    RECEIVED = "received"
    SOLD = "sold"
    ADJUSTED = "adjusted"
    RETURNED = "returned"
    DAMAGED = "damaged"
    TRANSFERRED = "transferred"


class POStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    ORDERED = "ordered"
    PARTIALLY_RECEIVED = "partially_received"
    RECEIVED = "received"
    CANCELLED = "cancelled"


# ==================== SUPPLIER SCHEMAS ====================

class SupplierBase(BaseModel):
    name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    lead_time_days: int = 7
    notes: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    lead_time_days: Optional[int] = None
    notes: Optional[str] = None


class Supplier(SupplierBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==================== LOCATION SCHEMAS ====================

class LocationBase(BaseModel):
    name: str
    address: Optional[str] = None
    is_default: int = 0


class LocationCreate(LocationBase):
    pass


class Location(LocationBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==================== INVENTORY ITEM SCHEMAS ====================

class InventoryItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: int
    price: float
    cost_price: float = 0.0
    category: str
    sku: Optional[str] = None
    reorder_level: int = 10
    supplier_id: Optional[int] = None


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[int] = None
    price: Optional[float] = None
    cost_price: Optional[float] = None
    category: Optional[str] = None
    sku: Optional[str] = None
    reorder_level: Optional[int] = None
    supplier_id: Optional[int] = None


class InventoryItem(InventoryItemBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    supplier: Optional[Supplier] = None

    class Config:
        from_attributes = True


# ==================== STOCK MOVEMENT SCHEMAS ====================

class StockMovementBase(BaseModel):
    quantity_change: int
    movement_type: MovementType
    reason: Optional[str] = None
    reference_number: Optional[str] = None


class StockMovementCreate(StockMovementBase):
    pass


class StockMovement(StockMovementBase):
    id: int
    item_id: int
    quantity_before: int
    quantity_after: int
    created_at: Optional[datetime] = None
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


# ==================== PURCHASE ORDER SCHEMAS ====================

class PurchaseOrderItemBase(BaseModel):
    item_id: int
    quantity_ordered: int
    unit_price: float


class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass


class PurchaseOrderItem(PurchaseOrderItemBase):
    id: int
    quantity_received: int = 0

    class Config:
        from_attributes = True


class PurchaseOrderBase(BaseModel):
    supplier_id: int
    notes: Optional[str] = None
    expected_delivery: Optional[datetime] = None


class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[PurchaseOrderItemCreate]


class PurchaseOrderUpdate(BaseModel):
    status: Optional[POStatus] = None
    notes: Optional[str] = None
    expected_delivery: Optional[datetime] = None


class PurchaseOrder(PurchaseOrderBase):
    id: int
    po_number: str
    status: str
    total_amount: float
    received_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    items: List[PurchaseOrderItem] = []
    supplier: Optional[Supplier] = None

    class Config:
        from_attributes = True


# ==================== ALERT CONFIG SCHEMAS ====================

class AlertConfigBase(BaseModel):
    email_recipients: Optional[str] = None
    low_stock_enabled: int = 1
    out_of_stock_enabled: int = 1


class AlertConfigUpdate(AlertConfigBase):
    pass


class AlertConfig(AlertConfigBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==================== DASHBOARD STATS SCHEMAS ====================

class DashboardStats(BaseModel):
    total_items: int
    total_quantity: int
    total_value: float
    low_stock_count: int
    out_of_stock_count: int


class CategoryBreakdown(BaseModel):
    category: str
    item_count: int
    total_value: float
    total_quantity: int


class AnalyticsData(BaseModel):
    categories: List[CategoryBreakdown]
    total_value: float
    average_item_value: float
