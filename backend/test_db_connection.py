
from sqlalchemy import text

from app.db import engine


def test_database_connection() -> None:
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        assert result.scalar_one() == 1

    print("Database connection successful!")


if __name__ == "__main__":
    test_database_connection()
