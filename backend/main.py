from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Scheduler API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/courses", response_model=List[schemas.CourseOut])
def list_courses(db: Session = Depends(get_db)):
    return db.query(models.Course).all()

@app.post("/courses", response_model=schemas.CourseOut)
def create_course(course: schemas.CourseCreate, db: Session = Depends(get_db)):
    db_course = models.Course(**course.model_dump())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course

@app.get("/courses/{course_id}", response_model=schemas.CourseOut)
def get_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(models.Course).get(course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    return course

@app.put("/courses/{course_id}", response_model=schemas.CourseOut)
def update_course(course_id: int, updated: schemas.CourseUpdate, db: Session = Depends(get_db)):
    course = db.query(models.Course).get(course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    for k, v in updated.model_dump().items():
        setattr(course, k, v)
    db.commit()
    db.refresh(course)
    return course

@app.delete("/courses/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(models.Course).get(course_id)
    if not course:
        raise HTTPException(404, "Course not found")
    db.delete(course)
    db.commit()
    return {"ok": True}