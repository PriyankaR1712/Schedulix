
from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


class JobCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    task_type: str = Field(min_length=1, max_length=50)
    priority: int = Field(default=3, ge=1, le=5)


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    task_type: str
    status: str
    priority: int
    created_at: datetime
