
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi import Query
from app.db import get_db
from app.models import Job
from app.schemas import JobCreate, JobResponse
from datetime import datetime, timezone

from sqlalchemy import select
router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post(
    "/",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_job(
    payload: JobCreate,
    db: Session = Depends(get_db),
) -> Job:
    name = payload.name.strip()
    task_type = payload.task_type.strip()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Job name cannot be empty.",
        )

    if not task_type:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Task type cannot be empty.",
        )

    job = Job(
        name=name,
        task_type=task_type,
        priority=payload.priority,
        input_data=payload.input_data,
        max_retries=payload.max_retries,
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    return job





@router.get("/", response_model=list[JobResponse])
def list_jobs(
    status_filter: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[Job]:
    query = db.query(Job)

    if status_filter is not None:
        allowed_statuses = {
            "queued",
            "running",
            "completed",
            "failed",
            "cancelled",
        }

        status_filter = status_filter.strip().lower()

        if status_filter not in allowed_statuses:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Invalid status. Choose queued, running, completed, "
                    "failed, or cancelled."
                ),
            )

        query = query.filter(Job.status == status_filter)

    return list(
        query.order_by(
            Job.created_at.desc(),
            Job.id.desc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
) -> Job:
    job = db.get(Job, job_id)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

    return job

@router.post("/{job_id}/cancel", response_model=JobResponse)
def cancel_job(job_id: int, db: Session = Depends(get_db)) -> Job:
    """Cancel a job that has not started running."""
    job = db.scalar(
        select(Job)
        .where(Job.id == job_id)
        .with_for_update()
    )

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

    if job.status != "queued":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot cancel a job with status '{job.status}'.",
        )

    job.status = "cancelled"
    job.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(job)

    return job

