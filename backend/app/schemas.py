from pydantic import BaseModel
from typing import Optional

class InventoryItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: int
    price: float
    category: str

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(InventoryItemBase):
    name: Optional[str] = None
    quantity: Optional[int] = None
    price: Optional[float] = None
    category: Optional[str] = None

class InventoryItem(InventoryItemBase):
    id: int

    class Config:
        from_attributes = True
