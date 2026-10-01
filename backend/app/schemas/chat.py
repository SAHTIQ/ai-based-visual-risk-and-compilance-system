from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    action: Optional[str] = None  # "explain_simply" | "explain_detailed" | "make_shorter" | "make_bullets" | "regenerate"
    model_tier: Optional[str] = None  # "auto" | "fast" | "strong"


class ChatMessageOut(BaseModel):
    id: int
    conversation_id: int
    sender: str
    content: str
    metadata_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationCreate(BaseModel):
    title: Optional[str] = "New Conversation"


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    is_pinned: Optional[bool] = None
    is_archived: Optional[bool] = None


class ConversationOut(BaseModel):
    id: int
    user_id: int
    title: str
    is_pinned: bool = False
    is_archived: bool = False
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    last_message: Optional[str] = None

    class Config:
        from_attributes = True


class ConversationDetailOut(BaseModel):
    id: int
    user_id: int
    title: str
    is_pinned: bool = False
    is_archived: bool = False
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageOut] = Field(default_factory=list)

    class Config:
        from_attributes = True


class ChatResponseOut(BaseModel):
    conversation_id: int
    user_message: ChatMessageOut
    assistant_message: ChatMessageOut
    is_success: bool = True
    is_configured: bool = True
    error_message: Optional[str] = None
    readiness: Optional[Dict[str, Any]] = None
    sources_used: Optional[List[str]] = None
    inline_cards: Optional[Dict[str, Any]] = None
    data_summary: Optional[Dict[str, Any]] = None


class SuggestionItem(BaseModel):
    category: str
    question: str


class ChatSuggestionsOut(BaseModel):
    categories: List[str]
    suggestions: List[SuggestionItem]

