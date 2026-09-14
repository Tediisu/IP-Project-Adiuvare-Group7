from sqlalchemy import Column, Integer, String, Time, Enum
from database import Base
import enum

class DayOfWeek(str, enum.Enum):
    monday = "monday"
    tuesday = "tuesday"
    wednesday = "wednesday"
    thursday = "thursday"
    friday = "friday"
    saturday = "saturday"
    sunday = "sunday"

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    hex_color = Column(String(7), nullable=False)  # e.g. "#FF5733"
    day = Column(Enum(DayOfWeek), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    course_type = Column(String(100), nullable=True)
    instructor = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)