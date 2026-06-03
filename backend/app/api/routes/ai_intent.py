from datetime import UTC, datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import current_user
from app.db import get_db
from app.models.entities import IntentSession, User
from app.schemas import AiIntentChatIn, AiIntentChatOut
from app.services.ai_intent_service import AiIntentService

router = APIRouter(prefix="/ai/intent", tags=["ai-intent"])


@router.post("/chat", response_model=AiIntentChatOut)
async def intent_chat(payload: AiIntentChatIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)) -> AiIntentChatOut:
    service = AiIntentService()
    provider, assistant_message, questions, intent = await service.interpret(payload.message, payload.history)
    ready = intent.follow_up_questions_completed or not questions
    intent_session = None
    if ready:
        intent_session = IntentSession(
            user_id=user.id,
            status="ACTIVE",
            source="ai_chat",
            session_title=intent.session_title,
            user_intent_summary=intent.user_intent_summary,
            category=intent.category,
            genres=intent.genres,
            moods=intent.moods,
            energy=intent.energy,
            boost_tags=intent.feed_query.boost_tags,
            exclude_tags=intent.feed_query.exclude_tags,
            intensity=intent.intensity,
            mainstream_level=intent.mainstream_level,
            expires_at=datetime.now(UTC) + timedelta(hours=6),
        )
        db.add(intent_session)
        await db.commit()
        await db.refresh(intent_session)
    return AiIntentChatOut(
        provider=provider,
        assistant_message=assistant_message,
        questions=questions,
        intent=intent,
        ready_to_start=ready,
        intent_session=intent_session,
    )
