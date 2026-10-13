import uuid

from pydantic import BaseModel


class CollegeOut(BaseModel):
    id: uuid.UUID
    name: str
    city: str
    latitude: float
    longitude: float
