from datetime import time
from typing import Literal

from pydantic import BaseModel, Field, model_validator

Day = Literal["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
ItemType = Literal["lecture", "lab"]


class ScheduleItemBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    days: list[Day] = Field(min_length=1)
    start_time: time
    end_time: time
    types: list[ItemType] = []
    instructor: str | None = None
    location: str | None = None

    @model_validator(mode="after")
    def check_times(self):
        if self.end_time <= self.start_time:
            raise ValueError("end time must be after start time")
        return self


class ScheduleItemCreate(ScheduleItemBase):
    pass


class ScheduleItem(ScheduleItemBase):
    id: int
