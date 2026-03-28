"""
Treasury Yield Curve & Liquidity Order Management API
Pulls yield data from US Treasury (with FRED fallback) and manages bank orders.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import sqlite3
import os
import json
from datetime import datetime, date
import xml.etree.ElementTree as ET
from typing import Optional
import httpx

app = FastAPI(title="Treasury Yield Curve API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(__file__), "orders.db")

# Treasury term labels and XML field mapping
TREASURY_FIELDS = {
    "1 Mo": "BC_1MONTH",
    "2 Mo": "BC_2MONTH",
    "3 Mo": "BC_3MONTH",
    "4 Mo": "BC_4MONTH",
    "6 Mo": "BC_6MONTH",
    "1 Yr": "BC_1YEAR",
    "2 Yr": "BC_2YEAR",
    "3 Yr": "BC_3YEAR",
    "5 Yr": "BC_5YEAR",
    "7 Yr": "BC_7YEAR",
    "10 Yr": "BC_10YEAR",
    "20 Yr": "BC_20YEAR",
    "30 Yr": "BC_30YEAR",
}

VALID_TERMS = list(TREASURY_FIELDS.keys())

# --- Database setup ---
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            term TEXT NOT NULL,
            amount REAL NOT NULL,
            yield_rate REAL,
            submitted_at TEXT NOT NULL,
            notes TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

# --- Yield data fetching ---
def fetch_treasury_yields() -> dict:
    """
    Attempt to fetch the latest Treasury yield curve from the official XML feed.
    Falls back to FRED API (St. Louis Fed) if Treasury site is unavailable.
    Returns dict of {term: yield_rate}.
    """
    # Try official US Treasury XML endpoint first
    now = datetime.now()
    year_month = now.strftime("%Y%m")
    treasury_url = (
        f"https://home.treasury.gov/resource-center/data-chart-center/"
        f"interest-rates/pages/xml?data=daily_treasury_yield_curve"
        f"&field_tdr_date_value={year_month}"
    )
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(treasury_url)
            if resp.status_code == 200:
                return _parse_treasury_xml(resp.text)
    except Exception:
        pass

    # Fallback: FRED API (no key needed for basic endpoints)
    return fetch_fred_yields()


def _parse_treasury_xml(xml_text: str) -> dict:
    """Parse Treasury XML and return the most recent date's yields."""
    ns = {"m": "http://schemas.microsoft.com/ado/2007/08/dataservices/metadata",
          "d": "http://schemas.microsoft.com/ado/2007/08/dataservices"}
    root = ET.fromstring(xml_text)
    # Get all entries (each is a date)
    entries = root.findall(".//{http://www.w3.org/2005/Atom}entry")
    if not entries:
        raise ValueError("No entries in Treasury XML")

    # Use the last entry (most recent date)
    last = entries[-1]
    props = last.find(".//{http://schemas.microsoft.com/ado/2007/08/dataservices/metadata}properties")
    results = {}
    for label, field in TREASURY_FIELDS.items():
        el = props.find(f"{{http://schemas.microsoft.com/ado/2007/08/dataservices}}{field}")
        if el is not None and el.text:
            try:
                results[label] = float(el.text)
            except ValueError:
                pass
    return results


def fetch_fred_yields() -> dict:
    """
    Fetch yield data from FRED (Federal Reserve Bank of St. Louis).
    Uses individual series for each maturity. No API key needed for basic access.
    """
    fred_series = {
        "1 Mo": "DGS1MO",
        "3 Mo": "DGS3MO",
        "6 Mo": "DGS6MO",
        "1 Yr": "DGS1",
        "2 Yr": "DGS2",
        "3 Yr": "DGS3",
        "5 Yr": "DGS5",
        "7 Yr": "DGS7",
        "10 Yr": "DGS10",
        "20 Yr": "DGS20",
        "30 Yr": "DGS30",
    }
    results = {}
    with httpx.Client(timeout=15.0) as client:
        for label, series_id in fred_series.items():
            url = (
                f"https://fred.stlouisfed.org/graph/fredgraph.csv"
                f"?id={series_id}&vintage_date={date.today().isoformat()}"
            )
            try:
                resp = client.get(url)
                if resp.status_code == 200:
                    lines = resp.text.strip().split("\n")
                    # CSV: DATE,VALUE — get last non-empty value
                    for line in reversed(lines[1:]):
                        parts = line.split(",")
                        if len(parts) == 2 and parts[1].strip() not in ("", "."):
                            results[label] = float(parts[1].strip())
                            break
            except Exception:
                continue
    return results


def get_static_yields() -> dict:
    """
    Static representative yield curve (as of late March 2026).
    Used as final fallback when both live sources are unavailable.
    """
    return {
        "1 Mo": 4.32,
        "2 Mo": 4.30,
        "3 Mo": 4.28,
        "4 Mo": 4.25,
        "6 Mo": 4.22,
        "1 Yr": 4.10,
        "2 Yr": 3.97,
        "3 Yr": 3.92,
        "5 Yr": 3.95,
        "7 Yr": 4.05,
        "10 Yr": 4.20,
        "20 Yr": 4.55,
        "30 Yr": 4.62,
    }


# --- Pydantic models ---
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


# --- Routes ---
@app.get("/api/yields")
async def get_yields():
    """Return the latest Treasury yield curve data."""
    yields = {}
    source = "live"

    try:
        yields = fetch_treasury_yields()
    except Exception:
        yields = {}

    if not yields:
        try:
            yields = fetch_fred_yields()
            source = "fred"
        except Exception:
            yields = {}

    if not yields:
        yields = get_static_yields()
        source = "static"

    # Build ordered list for chart
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


@app.post("/api/orders", response_model=Order)
async def create_order(order: OrderCreate):
    """Submit a new Treasury order."""
    if order.term not in VALID_TERMS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid term '{order.term}'. Valid terms: {VALID_TERMS}"
        )

    # Look up current yield for this term
    try:
        yields_data = fetch_treasury_yields()
        if not yields_data:
            yields_data = fetch_fred_yields()
        if not yields_data:
            yields_data = get_static_yields()
        yield_rate = yields_data.get(order.term)
    except Exception:
        yield_rate = get_static_yields().get(order.term)

    submitted_at = datetime.now().isoformat()

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "INSERT INTO orders (term, amount, yield_rate, submitted_at, notes) VALUES (?,?,?,?,?)",
        (order.term, order.amount, yield_rate, submitted_at, order.notes)
    )
    order_id = c.lastrowid
    conn.commit()
    conn.close()

    return Order(
        id=order_id,
        term=order.term,
        amount=order.amount,
        yield_rate=yield_rate,
        submitted_at=submitted_at,
        notes=order.notes,
    )


@app.get("/api/orders")
async def get_orders():
    """Return all historical orders, newest first."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, term, amount, yield_rate, submitted_at, notes FROM orders ORDER BY submitted_at DESC")
    rows = c.fetchall()
    conn.close()

    return [
        Order(id=r[0], term=r[1], amount=r[2], yield_rate=r[3], submitted_at=r[4], notes=r[5])
        for r in rows
    ]


@app.delete("/api/orders/{order_id}")
async def delete_order(order_id: int):
    """Delete an order by ID."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DELETE FROM orders WHERE id=?", (order_id,))
    if c.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Order not found")
    conn.commit()
    conn.close()
    return {"deleted": order_id}


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}
