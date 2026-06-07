from fastapi import APIRouter, Depends

from app.api.deps import current_user
from app.models.entities import User
from app.schemas import AiIntentChatIn, AiIntentChatOut
from app.services.ai_intent_service import AiIntentService

router = APIRouter(prefix="/ai/intent", tags=["ai-intent"])


@router.post("/chat", response_model=AiIntentChatOut)
async def intent_chat(payload: AiIntentChatIn, _: User = Depends(current_user)) -> AiIntentChatOut:
    service = AiIntentService()
    provider, assistant_message, questions, intent = await service.interpret(payload.message, payload.history)
    ready = intent.follow_up_questions_completed or not questions
    return AiIntentChatOut(
        provider=provider,
        assistant_message=assistant_message,
        questions=questions,
        intent=intent,
        ready_to_start=ready,
        intent_session=None,
    )
