import logging
from typing import List, Dict
from fastapi import WebSocket

logger = logging.getLogger("websocket_manager")

class ConnectionManager:
    def __init__(self):
        # Map of active user_id / session -> List of WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Simple list of all broadcast listeners
        self.broadcast_listeners: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, client_id: str = None):
        await websocket.accept()
        if client_id:
            if client_id not in self.active_connections:
                self.active_connections[client_id] = []
            self.active_connections[client_id].append(websocket)
        self.broadcast_listeners.append(websocket)
        logger.info(f"New WS Connection. Active clients: {len(self.active_connections)}, Broadcasters: {len(self.broadcast_listeners)}")

    def disconnect(self, websocket: WebSocket, client_id: str = None):
        if client_id and client_id in self.active_connections:
            if websocket in self.active_connections[client_id]:
                self.active_connections[client_id].remove(websocket)
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]
        if websocket in self.broadcast_listeners:
            self.broadcast_listeners.remove(websocket)
        logger.info("WS Connection closed.")

    async def send_personal_message(self, message: dict, client_id: str):
        if client_id in self.active_connections:
            for connection in self.active_connections[client_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to send personal message to {client_id}: {str(e)}")

    async def broadcast(self, message: dict):
        # Create a copy of the list to avoid modification issues during iteration
        listeners = list(self.broadcast_listeners)
        for connection in listeners:
            try:
                await connection.send_json(message)
            except Exception:
                # Remove stale connection
                if connection in self.broadcast_listeners:
                    self.broadcast_listeners.remove(connection)

manager = ConnectionManager()
