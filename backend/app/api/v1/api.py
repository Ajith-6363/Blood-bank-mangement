from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, stock, donations, requests, users, notifications, analytics, ai, websockets
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(stock.router, prefix="/stock", tags=["Blood Stock Management"])
api_router.include_router(donations.router, prefix="/donations", tags=["Donations & Appointments"])
api_router.include_router(requests.router, prefix="/requests", tags=["Blood Requests Management"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications Alerting"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Dashboard Analytics"])
api_router.include_router(users.router, prefix="/users", tags=["Users Management"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Intelligence"])
api_router.include_router(websockets.router, prefix="/ws", tags=["Real-time WS Connection"])
