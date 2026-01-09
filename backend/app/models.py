from sqlalchemy import Column, Integer, String, Float
from .database import Base

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    quantity = Column(Integer, default=0)
    price = Column(Float, default=0.0)
    category = Column(String, index=True)
