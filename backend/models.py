"""
Pydantic models for request validation and response serialization.
"""

from pydantic import BaseModel, Field
from typing import Optional


class OrderCreate(BaseModel):
    term: str = Field(..., description="Treasury term, e.g. '10 Yr'")
    amount: float = Field(..., gt=0, description="Order amount in USD")
    notes: Optional[str] = Field(None, description="Optional notes")


class Order(BaseModel):
    id: int
    term: str
    amount: float
    yield_rate: Optional[float]
    submitted_at: str
    notes: Optional[str]
