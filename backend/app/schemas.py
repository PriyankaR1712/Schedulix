from typing import Any
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field



class JobCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    task_type: str = Field(min_length=1, max_length=50)
    priority: int = Field(default=3, ge=1, le=5)
    input_data: dict[str, Any] | None = None
    max_retries: int = Field(default=2, ge=0, le=5)




class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    task_type: str
    status: str
    priority: int
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    error_message: str | None
    input_data: dict[str, Any] | None
    result: str | None
    retry_count: int
    max_retries: int
