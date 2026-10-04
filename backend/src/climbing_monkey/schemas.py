from datetime import datetime, timezone
from typing import Annotated, Literal, get_args

from pydantic import (
    AfterValidator,
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Goal = Literal["general", "technique", "mobility", "endurance"]
Movement = Literal[
    "controlled",
    "dynamic",
    "technical",
    "powerful",
    "balance",
    "coordination",
    "compression",
    "endurance",
]
MOVEMENTS = get_args(Movement)
Hold = Literal["jug", "crimp", "sloper", "pinch", "pocket", "volume"]
# Where a finger hurts, as a spot id from the app's packages/core/src/spots.ts, e.g. "a2".
SpotId = Annotated[str, StringConstraints(pattern=r"^[a-z0-9-]{1,32}$")]
HandRegion = Literal[
    "thumb",
    "index_finger",
    "middle_finger",
    "ring_finger",
    "little_finger",
    "palm",
    "back",
    "wrist",
]


def _distinct(values):
    if len(set(values)) != len(values):
        raise ValueError("List items must not repeat")
    return values


# One climb can use any combination of distinct movement styles.
Movements = Annotated[
    list[Movement], Field(min_length=1, max_length=len(MOVEMENTS)), AfterValidator(_distinct)
]
Holds = Annotated[list[Hold], AfterValidator(_distinct)]
Spots = Annotated[list[SpotId], Field(max_length=24), AfterValidator(_distinct)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class ClimberCreate(Input):
    name: Text
    goal: Goal = "general"


class ClimberUpdate(Input):
    name: Text | None = None
    goal: Goal | None = None
    pet_visible: bool | None = None


class Evidence(Input):
    occurred_at: AwareDatetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("occurred_at")
    @classmethod
    def utc_timestamp(cls, value):
        return value.astimezone(timezone.utc)


class ClimbCreate(Evidence):
    terrain: Literal["slab", "vertical", "overhang"]
    movement: Movement | None = None
    movements: Movements | None = None
    holds: Holds = Field(default_factory=list)
    completed: bool
    attempts: int | None = Field(default=None, ge=1, le=1000)
    grade: Text | None = None
    grade_system: Text | None = None
    location: Text | None = None

    @model_validator(mode="after")
    def movement_styles(self):
        """Accept `movement`, `movements` or both; store both, `movement` listed first."""
        if self.movement is None and self.movements is None:
            raise ValueError("Supply movement or movements")
        movements = self.movements or [self.movement]
        movement = self.movement or movements[0]
        if movement not in movements:
            raise ValueError("Movement must be one of movements")
        self.movement = movement
        self.movements = [movement, *(other for other in movements if other != movement)]
        return self


class FingerForceSetup(Input):
    instrument: Text
    grip: Literal["open_hand", "half_crimp", "full_crimp"]
    edge_mm: float = Field(gt=0)
    arm_position: Literal["straight", "bent"]
    effort_seconds: float = Field(gt=0)


class AssessmentCreate(Evidence):
    metric: Literal[
        "leg_spread",
        "height",
        "arm_span",
        "pullups",
        "hang_duration",
        "finger_force",
        "shoulder_reach_left",
        "shoulder_reach_right",
    ]
    value: float = Field(ge=0)
    unit: Literal["degrees", "cm", "repetitions", "seconds", "N", "kgf"]
    method: Literal["manual", "camera"]
    protocol: Text
    confidence: float = Field(default=1, ge=0, le=1)
    model_version: Text | None = None
    side: Literal["left", "right", "both"] | None = None
    setup: FingerForceSetup | None = None
    simulated: bool = False

    @model_validator(mode="after")
    def matching_unit(self):
        units = {
            "leg_spread": {"degrees"},
            "shoulder_reach_left": {"degrees"},
            "shoulder_reach_right": {"degrees"},
            "height": {"cm"},
            "arm_span": {"cm"},
            "pullups": {"repetitions"},
            "hang_duration": {"seconds"},
            "finger_force": {"N", "kgf"},
        }
        if self.metric == "finger_force":
            if self.value <= 0:
                raise ValueError("Instrument force must be positive")
            if self.side is None:
                raise ValueError("Finger force requires a measured hand side")
            if self.setup is None:
                raise ValueError("Finger force requires instrument setup")
        if self.unit not in units[self.metric]:
            raise ValueError("Unit does not match assessment metric")
        if self.method == "camera" and "confidence" not in self.model_fields_set:
            raise ValueError("Camera captures require explicit confidence")
        if self.method == "camera" and self.confidence < 0.7:
            raise ValueError("Camera capture confidence must be at least 0.7")
        if self.method == "camera" and self.metric not in {
            "leg_spread",
            "shoulder_reach_left",
            "shoulder_reach_right",
        }:
            raise ValueError("Camera estimation only supports leg spread and shoulder reach")
        if self.metric.startswith("shoulder_reach_") and self.side is not None:
            if self.side != self.metric.rsplit("_", 1)[1]:
                raise ValueError("Shoulder side must match the assessment metric")
        if self.unit == "degrees" and self.value > 180:
            raise ValueError("Projected angle cannot exceed 180 degrees")
        if self.metric in {"height", "arm_span"} and self.value <= 0:
            raise ValueError("Body length must be positive")
        if self.metric == "pullups" and not self.value.is_integer():
            raise ValueError("Repetition count must be a whole number")
        return self


class HandCreate(Evidence):
    side: Literal["left", "right"]
    region: HandRegion
    # None means sore, intensity not rated. 0 means no discomfort and clears the location.
    pain: int | None = Field(default=None, ge=0, le=10)
    spots: Spots = Field(default_factory=list)
    note: Annotated[str, StringConstraints(max_length=2000)] = ""
    photo_id: Text | None = None


class ActivityCreate(Evidence):
    kind: Text
    duration_minutes: float = Field(gt=0, le=1440)
    source: Literal["manual"] = "manual"


class Landmark(Input):
    x: float
    y: float
    z: float = 0
    visibility: float = Field(ge=0, le=1)


class LandmarkRequest(Input):
    landmarks: list[Landmark] = Field(max_length=33)
    image_width: int | None = Field(default=None, gt=0, le=20000)
    image_height: int | None = Field(default=None, gt=0, le=20000)

    @model_validator(mode="after")
    def paired_dimensions(self):
        if (self.image_width is None) != (self.image_height is None):
            raise ValueError("Supply both image dimensions or neither")
        return self
