from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Notification
from ..schemas import NotificationOut
from ..auth_utils import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationOut])
def get_user_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifs = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).limit(50).all()
    return [
        NotificationOut(
            id=n.id,
            title=n.title,
            message=n.message,
            target_route=n.target_route,
            unread=n.unread,
            created_at=n.created_at.strftime("%Y-%m-%d %H:%M") if n.created_at else "",
            timestamp=n.created_at.strftime("%H:%M") if n.created_at else ""
        )
        for n in notifs
    ]

@router.put("/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.unread == True
    ).update({"unread": False})
    db.commit()
    return {"status": "success"}

@router.put("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if notif:
        notif.unread = False
        db.commit()
    return {"status": "success"}
