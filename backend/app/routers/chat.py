from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.chat import Conversation, ChatMessage
from app.schemas.chat import (
    ConversationCreate,
    ConversationOut,
    ConversationDetailOut,
    ChatMessageCreate,
    ChatMessageOut,
    ChatResponseOut,
)
from app.services.llm import get_llm_service
from app.services.app_context import get_user_risk_context, build_system_prompt
from app.services.rag import rag_service

router = APIRouter(prefix="/api/chat", tags=["AI Assistant & Chat"])


@router.get("/conversations", response_model=List[ConversationOut])
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all persistent conversations belonging strictly to the authenticated user."""
    convs = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    result = []
    for c in convs:
        msgs = c.messages
        last_msg = msgs[-1].content[:80] + "..." if msgs else None
        result.append(
            ConversationOut(
                id=c.id,
                user_id=c.user_id,
                title=c.title,
                created_at=c.created_at,
                updated_at=c.updated_at,
                message_count=len(msgs),
                last_message=last_msg,
            )
        )
    return result


@router.post("/conversations", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
def create_conversation(
    payload: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new persistent conversation for the authenticated user."""
    conv = Conversation(
        user_id=current_user.id,
        title=payload.title or "New Investigation",
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return ConversationOut(
        id=conv.id,
        user_id=conv.user_id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=0,
        last_message=None,
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailOut)
def get_conversation_detail(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve full conversation message history with strict user isolation."""
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    return conv


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a conversation with strict user verification."""
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    db.delete(conv)
    db.commit()
    return None


@router.post("/conversations/{conversation_id}/messages", response_model=ChatResponseOut)
def post_message_to_conversation(
    conversation_id: int,
    payload: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Post a user message, ground response in authenticated user's records,
    call LLM service, persist both messages, and return the response.
    """
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    # 1. Save user message
    user_msg = ChatMessage(
        conversation_id=conv.id,
        sender="user",
        content=payload.content.strip(),
    )
    db.add(user_msg)
    conv.updated_at = datetime.now(timezone.utc)
    
    # Auto-title conversation on first message if default
    if conv.title == "New Conversation" or conv.title == "New Chat" or conv.title == "New Investigation":
        clean_title = payload.content.strip().split("\n")[0][:45]
        if clean_title:
            conv.title = clean_title

    db.commit()
    db.refresh(user_msg)

    # 2. Gather conversation history (last 10 messages for context)
    past_messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.conversation_id == conv.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    llm_messages = [
        {"role": "user" if m.sender == "user" else "assistant", "content": m.content}
        for m in past_messages[-10:]
    ]

    # 3. Build system prompt grounded in actual user records
    user_context = get_user_risk_context(db, current_user)
    system_prompt = build_system_prompt(user_context)

    # 4. Generate LLM response
    llm = get_llm_service()
    llm_resp = llm.generate(messages=llm_messages, system_prompt=system_prompt)

    # 5. Persist assistant message
    asst_msg = ChatMessage(
        conversation_id=conv.id,
        sender="assistant",
        content=llm_resp.content,
    )
    db.add(asst_msg)
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(asst_msg)

    return ChatResponseOut(
        conversation_id=conv.id,
        user_message=ChatMessageOut.model_validate(user_msg),
        assistant_message=ChatMessageOut.model_validate(asst_msg),
        is_success=llm_resp.is_success,
        is_configured=llm_resp.is_configured,
        error_message=llm_resp.error_message,
        readiness=rag_service.get_readiness_meta(),
    )


@router.post("/quick-ask", response_model=ChatResponseOut)
def quick_ask(
    payload: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Seamless entrypoint for the Dashboard chatbot panel.
    Finds the user's latest conversation or creates one automatically.
    """
    latest_conv = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
        .first()
    )
    if not latest_conv:
        latest_conv = Conversation(
            user_id=current_user.id,
            title="Dashboard Assistant",
        )
        db.add(latest_conv)
        db.commit()
        db.refresh(latest_conv)

    return post_message_to_conversation(
        conversation_id=latest_conv.id,
        payload=payload,
        current_user=current_user,
        db=db,
    )


@router.get("/readiness")
def get_readiness_status(
    current_user: User = Depends(get_current_user),
):
    """Check operational status of RAG and Web research infrastructure."""
    return rag_service.get_readiness_meta()
