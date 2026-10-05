from datetime import datetime, timezone
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.chat import Conversation, ChatMessage
from app.models.work_session import WorkSession
from app.models.habit import HabitRecord
from app.models.study import StudyRecord
from app.models.financial import FinancialRecord
from app.models.simulation import SimulationHistory
from app.schemas.chat import (
    ConversationCreate,
    ConversationUpdate,
    ConversationOut,
    ConversationDetailOut,
    ChatMessageCreate,
    ChatMessageOut,
    ChatResponseOut,
    ChatSuggestionsOut,
    SuggestionItem,
)
from app.services.llm import get_llm_service
from app.services.app_context import (
    get_user_productivity_context,
    build_system_prompt,
    generate_conversation_title,
    extract_inline_cards_and_sources,
)
from app.services.rag import rag_service
from app.services.context_synthesizer import synthesize_grounded_response

router = APIRouter(prefix="/api/chat", tags=["AI Productivity & Lifestyle Assistant"])


@router.get("/conversations", response_model=List[ConversationOut])
def list_conversations(
    include_archived: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all persistent conversations belonging strictly to the authenticated user."""
    query = db.query(Conversation).filter(Conversation.user_id == current_user.id)
    if not include_archived:
        query = query.filter(Conversation.is_archived.is_(False))

    convs = query.order_by(Conversation.is_pinned.desc(), Conversation.updated_at.desc()).all()
    result = []
    for c in convs:
        msgs = c.messages
        last_msg = msgs[-1].content[:80] + "..." if msgs else None
        result.append(
            ConversationOut(
                id=c.id,
                user_id=c.user_id,
                title=c.title,
                is_pinned=c.is_pinned,
                is_archived=c.is_archived,
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
        title=payload.title or "New Conversation",
        is_pinned=False,
        is_archived=False,
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return ConversationOut(
        id=conv.id,
        user_id=conv.user_id,
        title=conv.title,
        is_pinned=conv.is_pinned,
        is_archived=conv.is_archived,
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


@router.patch("/conversations/{conversation_id}", response_model=ConversationOut)
def update_conversation(
    conversation_id: int,
    payload: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update conversation properties (rename title, pin/unpin, archive/unarchive)."""
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    if payload.title is not None:
        new_title = payload.title.strip()
        if new_title:
            conv.title = new_title[:255]
    if payload.is_pinned is not None:
        conv.is_pinned = payload.is_pinned
    if payload.is_archived is not None:
        conv.is_archived = payload.is_archived

    conv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(conv)

    msgs = conv.messages
    last_msg = msgs[-1].content[:80] + "..." if msgs else None

    return ConversationOut(
        id=conv.id,
        user_id=conv.user_id,
        title=conv.title,
        is_pinned=conv.is_pinned,
        is_archived=conv.is_archived,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=len(msgs),
        last_message=last_msg,
    )


@router.get("/conversations/{conversation_id}/export")
def export_conversation(
    conversation_id: int,
    format: str = "markdown",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export conversation content as Markdown or JSON."""
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    if format.lower() == "json":
        return {
            "title": conv.title,
            "created_at": conv.created_at.isoformat(),
            "updated_at": conv.updated_at.isoformat(),
            "messages": [
                {
                    "sender": m.sender,
                    "content": m.content,
                    "created_at": m.created_at.isoformat(),
                }
                for m in conv.messages
            ],
        }

    # Markdown export
    lines = [
        f"# {conv.title}",
        f"*Exported from Personal Intelligence Assistant on {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}*",
        "",
    ]
    for m in conv.messages:
        role = "User" if m.sender == "user" else "Personal Intelligence Assistant"
        timestamp = m.created_at.strftime("%Y-%m-%d %H:%M")
        lines.append(f"### {role} ({timestamp})\n")
        lines.append(f"{m.content}\n")
        lines.append("---\n")

    return {"title": conv.title, "markdown": "\n".join(lines)}


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
    Post a user message, ground response in authenticated user's records via retrieval-first
    architecture, call the unified LLM service, persist both messages, and return the response.
    """
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    user_query = payload.content.strip()

    # 1. Save user message
    user_msg = ChatMessage(
        conversation_id=conv.id,
        sender="user",
        content=user_query,
    )
    db.add(user_msg)
    conv.updated_at = datetime.now(timezone.utc)

    # Auto-title conversation on first message if default
    if conv.title in ("New Conversation", "New Chat", "New Investigation", "Dashboard Assistant", "New Thread"):
        smart_title = generate_conversation_title(user_query)
        conv.title = smart_title

    db.commit()
    db.refresh(user_msg)

    # 2. Gather conversation history with compact summary for older turns (Chat History Optimization)
    past_messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.conversation_id == conv.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    conv_summary: Optional[str] = None
    if len(past_messages) > 6:
        older = past_messages[:-6]
        user_queries = [m.content[:50].strip() for m in older if m.sender == "user"]
        if user_queries:
            conv_summary = f"Earlier conversation ({len(older)} messages) covered topics: " + "; ".join(user_queries[-3:])
        active_turn_messages = past_messages[-6:]
    else:
        active_turn_messages = past_messages

    llm_messages = [
        {"role": "user" if m.sender == "user" else "assistant", "content": m.content}
        for m in active_turn_messages
    ]

    # 3. Retrieval-first architecture: query ONLY relevant PostgreSQL records & analytical metrics
    user_context = get_user_productivity_context(db, current_user, query=user_query)
    system_prompt = build_system_prompt(user_context, conversation_summary=conv_summary)
    meta_info = extract_inline_cards_and_sources(user_context, query=user_query)

    # 4. Generate LLM response with model routing and conservative output tokens
    llm = get_llm_service()
    llm_resp = llm.generate(
        messages=llm_messages,
        system_prompt=system_prompt,
        action=payload.action,
        user_context=user_context,
    )

    # 5. Persist assistant message
    asst_msg = ChatMessage(
        conversation_id=conv.id,
        sender="assistant",
        content=llm_resp.content,
        metadata_json=json.dumps(meta_info) if meta_info else None,
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
        sources_used=meta_info.get("sources_used"),
        inline_cards=meta_info.get("inline_cards"),
        data_summary=meta_info.get("data_summary"),
    )


@router.post("/conversations/{conversation_id}/stream")
def stream_message_to_conversation(
    conversation_id: int,
    payload: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Real SSE streaming endpoint.
    Emits real operational statuses:
      - Analyzing your data...
      - Retrieving relevant records...
      - Generating response...
    Then streams response tokens in real-time, persisting the final response.
    """
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    user_query = payload.content.strip()

    # Save user message
    user_msg = ChatMessage(
        conversation_id=conv.id,
        sender="user",
        content=user_query,
    )
    db.add(user_msg)
    conv.updated_at = datetime.now(timezone.utc)

    if conv.title in ("New Conversation", "New Chat", "New Investigation", "Dashboard Assistant", "New Thread"):
        conv.title = generate_conversation_title(user_query)

    db.commit()
    db.refresh(user_msg)

    # Gather conversation history
    past_messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.conversation_id == conv.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    conv_summary: Optional[str] = None
    if len(past_messages) > 6:
        older = past_messages[:-6]
        user_queries = [m.content[:50].strip() for m in older if m.sender == "user"]
        if user_queries:
            conv_summary = f"Earlier conversation ({len(older)} messages) covered topics: " + "; ".join(user_queries[-3:])
        active_turn_messages = past_messages[-6:]
    else:
        active_turn_messages = past_messages

    llm_messages = [
        {"role": "user" if m.sender == "user" else "assistant", "content": m.content}
        for m in active_turn_messages
    ]

    def event_generator():
        # Status 1: Analyzing data
        yield f"data: {json.dumps({'type': 'status', 'status': 'Analyzing your data...'})}\n\n"

        # Status 2: Retrieving records
        user_context = get_user_productivity_context(db, current_user, query=user_query)
        system_prompt = build_system_prompt(user_context, conversation_summary=conv_summary)
        meta_info = extract_inline_cards_and_sources(user_context, query=user_query)

        yield f"data: {json.dumps({'type': 'status', 'status': 'Retrieving relevant records...'})}\n\n"
        yield f"data: {json.dumps({'type': 'meta', 'sources_used': meta_info.get('sources_used'), 'inline_cards': meta_info.get('inline_cards'), 'data_summary': meta_info.get('data_summary')})}\n\n"

        # Status 3: Generating response
        yield f"data: {json.dumps({'type': 'status', 'status': 'Generating response...'})}\n\n"

        llm = get_llm_service()
        accumulated_chunks = []

        try:
            for chunk in llm.generate_stream(
                messages=llm_messages,
                system_prompt=system_prompt,
                action=payload.action,
                user_context=user_context,
            ):
                accumulated_chunks.append(chunk)
                yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
        except Exception as e:
            fallback_text = synthesize_grounded_response(
                user_context,
                user_query,
                action=payload.action,
                history=llm_messages,
            )
            accumulated_chunks.append(fallback_text)
            yield f"data: {json.dumps({'type': 'chunk', 'text': fallback_text})}\n\n"

        full_content = "".join(accumulated_chunks).strip()
        if not full_content:
            full_content = synthesize_grounded_response(
                user_context,
                user_query,
                action=payload.action,
                history=llm_messages,
            )

        # Save assistant message to DB
        asst_msg = ChatMessage(
            conversation_id=conv.id,
            sender="assistant",
            content=full_content,
            metadata_json=json.dumps(meta_info) if meta_info else None,
        )
        db.add(asst_msg)
        conv.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(asst_msg)

        yield f"data: {json.dumps({'type': 'done', 'assistant_message': {'id': asst_msg.id, 'conversation_id': conv.id, 'sender': 'assistant', 'content': full_content, 'created_at': asst_msg.created_at.isoformat()}})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
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


@router.get("/suggestions", response_model=ChatSuggestionsOut)
def get_chat_suggestions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Dynamically generates 6-8 suggested questions categorized by domain
    based on the authenticated user's actual database records.
    Never shows suggested questions for data domains with zero records.
    """
    user_id = current_user.id

    # Check existence of records per domain
    work_count = db.query(WorkSession).filter(WorkSession.user_id == user_id).count()
    habit_count = db.query(HabitRecord).filter(HabitRecord.user_id == user_id).count()
    study_count = db.query(StudyRecord).filter(StudyRecord.user_id == user_id).count()
    fin_count = db.query(FinancialRecord).filter(FinancialRecord.user_id == user_id).count()
    sim_count = db.query(SimulationHistory).filter(SimulationHistory.user_id == user_id).count()

    categories: List[str] = []
    suggestions: List[SuggestionItem] = []

    # 1. Productivity (Base domain)
    categories.append("PRODUCTIVITY")
    suggestions.append(
        SuggestionItem(
            category="PRODUCTIVITY",
            question="Summarize my recent productivity and activity patterns.",
        )
    )
    suggestions.append(
        SuggestionItem(
            category="PRODUCTIVITY",
            question="How has my productivity changed over the past few weeks?",
        )
    )

    # 2. Habits (Only if habit records exist)
    if habit_count > 0:
        categories.append("HABITS")
        suggestions.append(
            SuggestionItem(
                category="HABITS",
                question="What habits are affecting my productivity the most?",
            )
        )

    # 3. Forecasts (If enough historical work/productivity sessions exist)
    if work_count >= 3:
        categories.append("FORECASTS")
        suggestions.append(
            SuggestionItem(
                category="FORECASTS",
                question="What does my recent behaviour suggest about my future productivity?",
            )
        )
        suggestions.append(
            SuggestionItem(
                category="FORECASTS",
                question="Explain my latest forecast and the factors influencing it.",
            )
        )

    # 4. Study & Work Sessions (Only if study records exist)
    if study_count > 0:
        categories.append("STUDY & WORK")
        suggestions.append(
            SuggestionItem(
                category="STUDY & WORK",
                question="What are the main patterns in my study and work sessions?",
            )
        )

    # 5. Simulations (If simulation history exists or enough multi-domain data)
    if sim_count > 0 or (work_count >= 2 and (habit_count > 0 or fin_count > 0)):
        categories.append("SIMULATIONS")
        suggestions.append(
            SuggestionItem(
                category="SIMULATIONS",
                question="What does my latest simulation indicate about my future routine?",
            )
        )

    # 6. Lifestyle / Recommendations (If financial or general activity data exists)
    if fin_count > 0 or work_count > 0 or habit_count > 0:
        categories.append("LIFESTYLE")
        suggestions.append(
            SuggestionItem(
                category="LIFESTYLE",
                question="Give me practical recommendations based on my recent activity.",
            )
        )

    # Cap to 8 high-impact suggestions
    return ChatSuggestionsOut(
        categories=categories,
        suggestions=suggestions[:8],
    )


@router.get("/readiness")
def get_readiness_status(
    current_user: User = Depends(get_current_user),
):
    """Check operational status of RAG and Web research infrastructure."""
    return rag_service.get_readiness_meta()
