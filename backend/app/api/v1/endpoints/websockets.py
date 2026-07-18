from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging

from app.websockets.manager import manager

router = APIRouter()
logger = logging.getLogger("websocket_route")

@router.websocket("/live")
async def websocket_endpoint(websocket: WebSocket, client_id: str = None):
    await manager.connect(websocket, client_id)
    try:
        while True:
            # Keep connection open, handle any incoming diagnostic commands from client
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)
    except Exception as e:
        logger.error(f"Error in websocket loop: {str(e)}")
        manager.disconnect(websocket, client_id)
