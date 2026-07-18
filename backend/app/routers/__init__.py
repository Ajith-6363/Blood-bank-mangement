from app.routers.auth import router as auth_router
from app.routers.stock import router as stock_router
from app.routers.donations import router as donations_router
from app.routers.requests import router as requests_router
from app.routers.notifications import router as notifications_router
from app.routers.analytics import router as analytics_router
from app.routers.users import router as users_router

__all__ = [
    "auth_router",
    "stock_router",
    "donations_router",
    "requests_router",
    "notifications_router",
    "analytics_router",
    "users_router"
]
