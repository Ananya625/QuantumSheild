import datetime
from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def send_json(self, session_id: str, event_type: str, message: str, data: dict = None):
        """Sends a structured event message to all clients connected to a specific session."""
        if session_id in self.active_connections:
            payload = {
                "event": event_type,
                "timestamp": datetime.datetime.now().strftime("%H:%M:%S.%f")[:-3],
                "message": message,
                "data": data or {}
            }
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_json(payload)
                except Exception:
                    # Connection might have closed unexpectedly
                    pass

manager = ConnectionManager()
