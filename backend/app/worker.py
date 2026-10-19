import time
import json
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Job
from app.tasks.handlers import generate_report, summarize_csv

logger = logging.getLogger(__name__)

TASK_HANDLERS = {
    "report": generate_report,
    "csv_summary": summarize_csv,
}


def execute_job(db: Session, job: Job) -> None:
    """Execute one job and persist its result or failure."""
    job.started_at = datetime.now(timezone.utc)
    job.status = "running"
    db.commit()

    try:
        handler = TASK_HANDLERS.get(job.task_type)

        if handler is None:
            raise ValueError(f"Unsupported task type: {job.task_type}")

        if job.task_type == "csv_summary":
            input_data = job.input_data or {}
            file_path = input_data.get("file_path")

            if not isinstance(file_path, str) or not file_path.strip():
                raise ValueError(
                    "csv_summary requires a file_path in input_data."
                )

            result = handler(file_path)
        else:
            result = handler()

        job.result = json.dumps(result)
        job.status = "completed"
        job.error_message = None

        logger.info("Job %s completed successfully.", job.id)

    except Exception as exc:
        logger.exception("Job %s failed", job.id)
        job.status = "failed"
        job.error_message = str(exc)[:2000]
        job.result = None

    finally:
        job.completed_at = datetime.now(timezone.utc)
        db.commit()


def process_next_job() -> bool:
    """Process one queued job. Return False if the queue is empty."""
    with SessionLocal() as db:
        job = db.scalar(
            select(Job)
            .where(Job.status == "queued")
            .order_by(
                Job.priority.asc(),
                Job.created_at.asc(),
                Job.id.asc(),
            )
            .limit(1)
            .with_for_update(skip_locked=True)
        )

        if job is None:
            return False

        execute_job(db, job)
        return True

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    logger.info("Schedulix worker started.")

    try:
        while True:
            processed = process_next_job()

            if not processed:
                time.sleep(2)
    except KeyboardInterrupt:
        logger.info("Schedulix worker stopped.")

