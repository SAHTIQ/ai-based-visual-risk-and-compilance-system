import json
from sqlalchemy.orm import Session
from app.models.activity import ActivityHistory

def log_activity(
    db: Session,
    user_id: int,
    activity_type: str,
    description: str,
    metadata: dict | None = None
) -> ActivityHistory:
    """
    Helper function to automatically record activity_history entries
    for critical backend user actions.
    """
    activity_entry = ActivityHistory(
        user_id=user_id,
        activity_type=activity_type,
        description=description,
        metadata_json=json.dumps(metadata) if metadata else None
    )
    db.add(activity_entry)
    db.commit()
    db.refresh(activity_entry)
    return activity_entry
