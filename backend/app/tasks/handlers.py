
from datetime import datetime, timezone
from typing import Any
import csv
from pathlib import Path

def generate_report() -> dict[str, Any]:
    """Generate a simple report with the current UTC timestamp."""
    return {
        "report_type": "system_report",
        "message": "Schedulix report generated successfully.",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

def summarize_csv(file_path: str) -> dict[str, Any]:
    """Summarize a CSV file from an explicitly supplied local path."""
    path = Path(file_path)

    if not path.is_file() or path.suffix.lower() != ".csv":
        raise ValueError("A valid CSV file path is required.")

    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        rows = list(reader)

    return {
        "file_name": path.name,
        "row_count": len(rows),
        "columns": reader.fieldnames or [],
    }
