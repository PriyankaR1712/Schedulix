
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Job
from app.schemas import JobCreate, JobResponse

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
    db: Session = Depends(get_db),
) -> list[Job]:
    return list(
        db.query(Job)
        .order_by(Job.created_at.desc(), Job.id.desc())
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
