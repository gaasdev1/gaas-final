from openai import AsyncOpenAI
from app.config.settings import get_settings


class OpenAIService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.client = AsyncOpenAI(api_key=self.settings.openai_api_key) if self.settings.openai_api_key else None

    async def embedding(self, text: str) -> list[float] | None:
        if not self.client:
            return None
        response = await self.client.embeddings.create(model=self.settings.openai_embedding_model, input=text[:8000])
        return response.data[0].embedding

    async def explain(self, liked: list[str], item: str) -> str:
        if not self.client:
            return "Consigliato perche' combina generi, tono e segnali di gusto simili ai contenuti che hai apprezzato."
        prompt = (
            "Write a premium, human recommendation explanation in max 2 short sentences.\n"
            f"User liked: {', '.join(liked[:8])}\nRecommended item: {item}"
        )
        response = await self.client.responses.create(model="gpt-4.1-mini", input=prompt)
        return response.output_text.strip()

