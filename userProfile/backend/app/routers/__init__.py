from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.routers.profiles import router as profiles_router
from app.routers.financial import router as financial_router
from app.routers.study import router as study_router
from app.routers.habits import router as habits_router
from app.routers.activity import router as activity_router
from app.routers.settings import router as settings_router
from app.routers.behavior import router as behavior_router
from app.routers.analytics import router as analytics_router
from app.routers.forecast import router as forecast_router
from app.routers.simulation import router as simulation_router

__all__ = [
    "auth_router",
    "users_router",
    "profiles_router",
    "financial_router",
    "study_router",
    "habits_router",
    "activity_router",
    "settings_router",
    "behavior_router",
    "analytics_router",
    "forecast_router",
    "simulation_router",
]
