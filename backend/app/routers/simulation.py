from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.simulation import (
    BaselineMetrics,
    SimulationHistoryItem,
    SimulationResponse,
    WhatIfParameters,
)
from app.services.simulation import (
    compute_user_baseline,
    delete_user_simulation_history,
    get_user_simulation_history,
    run_simulation,
)


router = APIRouter(prefix="/api/simulation", tags=["Future Simulation"])


@router.get("/future", response_model=SimulationResponse)
def future_simulation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Existing backward-compatible simulation endpoint enriched with baseline, horizons, rules, and sensitivity."""
    return run_simulation(db, current_user.id)


@router.get("/baseline", response_model=BaselineMetrics)
def get_simulation_baseline(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve actual baseline metrics derived directly from authenticated user records."""
    return compute_user_baseline(db, current_user.id)


@router.post("/simulate", response_model=SimulationResponse)
def simulate_scenario(
    params: WhatIfParameters,
    save: bool = Query(False, description="Whether to persist this simulation to user history"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run custom what-if scenario with multi-horizon trajectories, sensitivity, and rule explainability."""
    return run_simulation(db, current_user.id, params=params, save_to_history=save)


@router.get("/history", response_model=List[SimulationHistoryItem])
def get_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get saved simulation history strictly isolated to the authenticated user."""
    return get_user_simulation_history(db, current_user.id)


@router.delete("/history/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history_item(
    history_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a simulation history item belonging strictly to the authenticated user."""
    success = delete_user_simulation_history(db, current_user.id, history_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulation history entry not found.")
    return None
