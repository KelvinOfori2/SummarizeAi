"""
WebSocket endpoint — real-time updates for authenticated users.

Clients connect with:
  ws://localhost:8000/ws?token=<access_token>

Events broadcast to a user:
  { "type": "summary_created",  "data": { ...summary fields } }
  { "type": "summary_deleted",  "data": { "id": "..." } }
  { "type": "stats_updated",    "data": { ...user stats } }
  { "type": "notification",     "data": { "title": "...", "message": "..." } }
  { "type": "ping",             "data": {} }   ← keep-alive every 30s

Admin-only broadcast events:
  { "type": "user_joined",      "data": { "username": "...", "total_users": N } }
  { "type": "admin_stats",      "data": { ...platform-wide stats } }
"""

import asyncio
import json
from typing import Dict, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models.user import User
from app.core.logging import get_logger

logger = get_logger("websocket")
router = APIRouter(tags=["WebSocket"])


# ── Connection Manager ────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        # user_id -> set of active WebSocket connections
        self._user_sockets: Dict[str, Set[WebSocket]] = {}
        # admin sockets for broadcast
        self._admin_sockets: Set[WebSocket] = set()

    # ── connect / disconnect ──────────────────────────────────────────────────

    async def connect(self, websocket: WebSocket, user_id: str, is_admin: bool):
        await websocket.accept()
        if user_id not in self._user_sockets:
            self._user_sockets[user_id] = set()
        self._user_sockets[user_id].add(websocket)
        if is_admin:
            self._admin_sockets.add(websocket)
        logger.info(f"WS connected  user={user_id}  admin={is_admin}  "
                    f"total_connections={self.total_connections}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self._user_sockets:
            self._user_sockets[user_id].discard(websocket)
            if not self._user_sockets[user_id]:
                del self._user_sockets[user_id]
        self._admin_sockets.discard(websocket)
        logger.info(f"WS disconnected  user={user_id}  "
                    f"total_connections={self.total_connections}")

    # ── send helpers ──────────────────────────────────────────────────────────

    async def _send(self, websocket: WebSocket, payload: dict):
        try:
            await websocket.send_text(json.dumps(payload, default=str))
        except Exception:
            pass  # socket already closed

    async def send_to_user(self, user_id: str, event_type: str, data: dict):
        """Send an event to all connections belonging to one user."""
        sockets = list(self._user_sockets.get(user_id, set()))
        for ws in sockets:
            await self._send(ws, {"type": event_type, "data": data})

    async def broadcast_admins(self, event_type: str, data: dict):
        """Send an event to every connected admin."""
        for ws in list(self._admin_sockets):
            await self._send(ws, {"type": event_type, "data": data})

    async def broadcast_all(self, event_type: str, data: dict):
        """Send an event to every connected user."""
        for sockets in list(self._user_sockets.values()):
            for ws in list(sockets):
                await self._send(ws, {"type": event_type, "data": data})

    @property
    def total_connections(self) -> int:
        return sum(len(s) for s in self._user_sockets.values())

    @property
    def connected_user_ids(self) -> list:
        return list(self._user_sockets.keys())


# Singleton — imported by services to emit events
manager = ConnectionManager()


# ── Auth helper ───────────────────────────────────────────────────────────────

def _authenticate_ws(token: str, db: Session):
    """Validate JWT and return the User, or None."""
    if not token:
        return None
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    user = db.query(User).filter(
        User.id == user_id,
        User.is_active == True,
        User.is_banned == False,
    ).first()
    return user


# ── WebSocket endpoint ────────────────────────────────────────────────────────

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(default=""),
):
    """
    Connect with:  ws://localhost:8000/ws?token=<jwt_access_token>
    """
    db = SessionLocal()
    user = None
    try:
        user = _authenticate_ws(token, db)
        if not user:
            await websocket.accept()
            await websocket.send_text(json.dumps({
                "type": "error",
                "data": {"message": "Invalid or expired token. Connection refused."},
            }))
            await websocket.close(code=4001)
            return

        is_admin = user.role == "admin"
        await manager.connect(websocket, user.id, is_admin)

        # Welcome message
        await manager.send_to_user(user.id, "connected", {
            "message": f"Connected as {user.username}",
            "user_id": user.id,
            "role": user.role,
        })

        # Notify admins that a new user connected
        if not is_admin:
            await manager.broadcast_admins("user_online", {
                "user_id": user.id,
                "username": user.username,
                "online_count": manager.total_connections,
            })

        # Keep-alive ping loop
        ping_task = asyncio.create_task(_ping_loop(websocket, user.id))

        try:
            while True:
                raw = await websocket.receive_text()
                try:
                    msg = json.loads(raw)
                except json.JSONDecodeError:
                    continue

                msg_type = msg.get("type", "")

                # Client pong response — just ignore
                if msg_type == "pong":
                    continue

                # Client can request their stats on demand
                if msg_type == "get_stats":
                    from app.services.user_service import get_user_stats
                    stats = get_user_stats(db, user.id)
                    await manager.send_to_user(user.id, "stats_updated", stats)
                    continue

                # Admin can request platform-wide stats
                if msg_type == "get_admin_stats" and is_admin:
                    stats = _get_platform_stats(db)
                    await manager.send_to_user(user.id, "admin_stats", stats)
                    continue

        except WebSocketDisconnect:
            pass
        finally:
            ping_task.cancel()

    finally:
        if user:
            manager.disconnect(websocket, user.id)
            if user.role != "admin":
                await manager.broadcast_admins("user_offline", {
                    "user_id": user.id,
                    "username": user.username,
                    "online_count": manager.total_connections,
                })
        db.close()


async def _ping_loop(websocket: WebSocket, user_id: str):
    """Send a ping every 25 seconds to keep the connection alive."""
    try:
        while True:
            await asyncio.sleep(25)
            await manager._send(websocket, {"type": "ping", "data": {}})
    except asyncio.CancelledError:
        pass


def _get_platform_stats(db: Session) -> dict:
    from sqlalchemy import func
    from app.models.user import User as UserModel
    from app.models.summary import Summary
    total_users = db.query(func.count(UserModel.id)).scalar() or 0
    total_summaries = db.query(func.count(Summary.id)).scalar() or 0
    return {
        "total_users": total_users,
        "total_summaries": total_summaries,
        "online_connections": manager.total_connections,
    }
