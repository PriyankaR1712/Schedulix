
import tempfile
from pathlib import Path

from app.tasks.handlers import generate_report, summarize_csv


def test_generate_report():
    result = generate_report()

    assert result["report_type"] == "system_report"
    assert result["message"] == "Schedulix report generated successfully."
    assert "generated_at" in result


def test_summarize_csv():
    with tempfile.TemporaryDirectory() as temp_dir:
        csv_path = Path(temp_dir) / "sample.csv"
        csv_path.write_text(
            "name,score\nAlice,90\nBob,85\n",
            encoding="utf-8",
        )

        result = summarize_csv(str(csv_path))

        assert result["file_name"] == "sample.csv"
        assert result["row_count"] == 2
        assert result["columns"] == ["name", "score"]


def test_summarize_csv_rejects_non_csv():
    try:
        summarize_csv("missing.txt")
    except ValueError:
        pass
    else:
        raise AssertionError("Expected ValueError for a non-CSV file")


if __name__ == "__main__":
    test_generate_report()
    test_summarize_csv()
    test_summarize_csv_rejects_non_csv()
    print("All task handler tests passed!")
