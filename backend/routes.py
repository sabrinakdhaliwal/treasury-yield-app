"""
API route definitions.
Yields and order management endpoints.
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime

from db import get_connection
from models import Order, OrderCreate
from yields import get_yields, VALID_TERMS

router = APIRouter()


@router.get("/api/yields")
def fetch_yields():
    """Return the latest Treasury yield curve and metadata."""
    yields, source = get_yields()

    curve = [
        {"term": term, "yield": yields.get(term)}
        for term in VALID_TERMS
        if yields.get(term) is not None
    ]

    return {
        "curve": curve,
        "source": source,
        "as_of": datetime.now().strftime("%B %d, %Y"),
        "valid_terms": VALID_TERMS,
    }


@router.post("/api/orders", response_model=Order)
def create_order(order: OrderCreate):
    """Submit a new Treasury order, locking in the current yield at submission time."""
    if order.term not in VALID_TERMS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid term '{order.term}'. Valid terms: {VALID_TERMS}",
        )

    yields, _ = get_yields()
    yield_rate = yields.get(order.term)
    submitted_at = datetime.now().isoformat()

    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO orders (term, amount, yield_rate, submitted_at, notes) VALUES (?,?,?,?,?)",
            (order.term, order.amount, yield_rate, submitted_at, order.notes),
        )
        order_id = cursor.lastrowid
        conn.commit()
    finally:
        conn.close()

    return Order(
        id=order_id,
        term=order.term,
        amount=order.amount,
        yield_rate=yield_rate,
        submitted_at=submitted_at,
        notes=order.notes,
    )


@router.get("/api/orders")
def get_orders():
    """Return all historical orders, newest first."""
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT id, term, amount, yield_rate, submitted_at, notes "
            "FROM orders ORDER BY submitted_at DESC"
        ).fetchall()
    finally:
        conn.close()

    return [
        Order(id=r[0], term=r[1], amount=r[2], yield_rate=r[3], submitted_at=r[4], notes=r[5])
        for r in rows
    ]


@router.delete("/api/orders/{order_id}")
def delete_order(order_id: int):
    """Delete an order by ID."""
    conn = get_connection()
    try:
        result = conn.execute("DELETE FROM orders WHERE id=?", (order_id,))
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Order not found")
        conn.commit()
    finally:
        conn.close()

    return {"deleted": order_id}


@router.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}
