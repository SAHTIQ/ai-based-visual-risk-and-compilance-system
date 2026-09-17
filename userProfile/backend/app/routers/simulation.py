from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.simulation import SimulationResponse
from app.services.simulation import run_simulation


router = APIRouter(prefix="/api/simulation", tags=["Future Simulation"])


@router.get("/future", response_model=SimulationResponse)
def future_simulation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return run_simulation(db, current_user.id)