from datetime import date


def to_iso_string(d: date | str) -> str:
    """Normalize a date to ISO 8601 string format."""
    if isinstance(d, str):
        return d  # Already a string, assume ISO format
    return d.isoformat()


def parse_date(d: date | str) -> date:
    """Parse a date from either a date object or ISO string."""
    if isinstance(d, date):
        return d
    return date.fromisoformat(d)


def trip_duration_days(start_date: date | str, end_date: date | str) -> int:
    """Calculate inclusive trip duration in days."""
    start = parse_date(start_date)
    end = parse_date(end_date)
    return (end - start).days + 1  # +1 for inclusive end date
