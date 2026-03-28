"""
Treasury yield data fetching.

Tries three sources in order:
  1. US Treasury XML feed (official, real-time)
  2. FRED CSV API (St. Louis Fed, no key required)
  3. Static fallback (representative March 2026 values)
"""

import xml.etree.ElementTree as ET
from datetime import datetime, date
import httpx

# Mapping from display label to Treasury XML field name
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

# FRED series IDs per maturity (subset — FRED doesn't have 2Mo/4Mo)
FRED_SERIES = {
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


def get_yields() -> tuple[dict, str]:
    """
    Return (yields_dict, source_label).
    Tries Treasury → FRED → static, in that order.
    """
    yields = _fetch_treasury()
    if yields:
        return yields, "live"

    yields = _fetch_fred()
    if yields:
        return yields, "fred"

    return _static_yields(), "static"


def _fetch_treasury() -> dict:
    """Fetch from the official US Treasury XML endpoint."""
    year_month = datetime.now().strftime("%Y%m")
    url = (
        f"https://home.treasury.gov/resource-center/data-chart-center/"
        f"interest-rates/pages/xml?data=daily_treasury_yield_curve"
        f"&field_tdr_date_value={year_month}"
    )
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url)
            if resp.status_code == 200:
                return _parse_treasury_xml(resp.text)
    except Exception:
        pass
    return {}


def _parse_treasury_xml(xml_text: str) -> dict:
    """Parse Treasury XML and return the most recent date's yields."""
    root = ET.fromstring(xml_text)
    entries = root.findall(".//{http://www.w3.org/2005/Atom}entry")
    if not entries:
        return {}

    last = entries[-1]
    props = last.find(
        ".//{http://schemas.microsoft.com/ado/2007/08/dataservices/metadata}properties"
    )
    results = {}
    for label, field in TREASURY_FIELDS.items():
        el = props.find(
            f"{{http://schemas.microsoft.com/ado/2007/08/dataservices}}{field}"
        )
        if el is not None and el.text:
            try:
                results[label] = float(el.text)
            except ValueError:
                pass
    return results


def _fetch_fred() -> dict:
    """Fetch from FRED CSV endpoints. No API key required."""
    results = {}
    with httpx.Client(timeout=15.0) as client:
        for label, series_id in FRED_SERIES.items():
            url = (
                f"https://fred.stlouisfed.org/graph/fredgraph.csv"
                f"?id={series_id}&vintage_date={date.today().isoformat()}"
            )
            try:
                resp = client.get(url)
                if resp.status_code == 200:
                    lines = resp.text.strip().split("\n")
                    for line in reversed(lines[1:]):
                        parts = line.split(",")
                        if len(parts) == 2 and parts[1].strip() not in ("", "."):
                            results[label] = float(parts[1].strip())
                            break
            except Exception:
                continue
    return results


def _static_yields() -> dict:
    """Representative yield curve as of March 2026. Used as a last resort."""
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
