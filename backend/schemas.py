from pydantic import BaseModel, field_validator
from datetime import time
from typing import Optional
from models import DayOfWeek
import re

class CourseBase(BaseModel):
    name: str
    hex_color: str
    day: DayOfWeek
    start_time: time
    end_time: time
    course_type: Optional[str] = None
    instructor: Optional[str] = None
    location: Optional[str] = None

    @field_validator("hex_color")
    @classmethod
    def validate_hex(cls, v):
        if not re.fullmatch(r"#[0-9A-Fa-f]{6}", v):
            raise ValueError("hex_color must look like #RRGGBB")
        return v

class CourseCreate(CourseBase):
    pass

class CourseUpdate(CourseBase):
    pass

class CourseOut(CourseBase):
    id: int
    class Config:
        from_attributes = True