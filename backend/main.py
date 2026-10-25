"""Snug API: a rules engine for car seat harness checks, plus an optional vision point finder."""

from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from rules import evaluate
from vision import VisionError, configured, find_points

app = FastAPI(title="Snug", version="1.0.0")


class Point(BaseModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)


class Flag(BaseModel):
    present: Optional[bool] = None
    confidence: float = Field(default=1.0, ge=0, le=1)


class Points(BaseModel):
    left_shoulder: Optional[Point] = None
    right_shoulder: Optional[Point] = None
    chest_clip: Optional[Point] = None
    left_strap: Optional[Point] = None
    right_strap: Optional[Point] = None
    hips: Optional[Point] = None


class Flags(BaseModel):
    coat: Optional[Flag] = None
    twist: Optional[Flag] = None


class Child(BaseModel):
    weight: Optional[float] = Field(default=None, gt=0, lt=200)
    height: Optional[float] = Field(default=None, gt=0, lt=80)


class Limits(BaseModel):
    rear_weight: Optional[float] = Field(default=None, gt=0, lt=200)
    rear_height: Optional[float] = Field(default=None, gt=0, lt=80)
    forward_weight: Optional[float] = Field(default=None, gt=0, lt=200)
    forward_height: Optional[float] = Field(default=None, gt=0, lt=80)


class Check(BaseModel):
    direction: Literal["rear", "forward"] = "rear"
    points: Points = Points()
    flags: Flags = Flags()
    pinch: Optional[Literal["fold", "no_fold"]] = None
    inch: Optional[Literal["moves", "steady"]] = None
    made: Optional[str] = Field(default=None, max_length=10)
    lifespan: Optional[int] = Field(default=None, ge=1, le=15)
    child: Child = Child()
    limits: Limits = Limits()


class Detect(BaseModel):
    image: str = Field(max_length=8_000_000)
    media_type: Literal["image/jpeg", "image/png", "image/webp"] = "image/jpeg"


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/config")
def config():
    return {"vision": configured()}


@app.post("/api/evaluate")
def evaluate_check(body: Check):
    return evaluate(body.model_dump())


@app.post("/api/detect")
def detect(body: Detect):
    image = body.image.split(",", 1)[1] if body.image.startswith("data:") else body.image
    try:
        return find_points(image, body.media_type)
    except VisionError as exc:
        raise HTTPException(503, str(exc)) from exc
