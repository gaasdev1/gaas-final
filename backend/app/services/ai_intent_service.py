import json
from app.config.settings import get_settings
from app.schemas import AiChatMessage, IntentData, IntentFeedQuery
from openai import AsyncOpenAI


CATEGORY_ALIASES = {
    "film": "movie",
    "movie": "movie",
    "cinema": "movie",
    "serie": "tv",
    "tv": "tv",
    "anime": "anime",
    "gioco": "game",
    "giochi": "game",
    "game": "game",
    "libro": "book",
    "libri": "book",
    "book": "book",
    "podcast": "podcast",
    "episodio": "podcast",
    "conversazione": "podcast",
    "intervista": "podcast",
    "musica": "podcast",
    "canzone": "podcast",
    "music": "podcast",
}

SIGNAL_GROUPS = [
    (["horror", "disturbante", "paura", "incubo", "inquietante"], ["horror", "thriller"], ["oscuro", "disturbante", "psicologico"], ["slow-burn", "tense"]),
    (["psicologico", "mente", "identita", "ossessione"], ["thriller"], ["psicologico", "teso", "cerebrale"], ["slow-burn"]),
    (["triste", "malinconico", "nostalgico", "solo", "solitudine"], ["dramma"], ["malinconico", "emotivo", "intimo"], ["slow-burn"]),
    (["sci-fi", "fantascienza", "spazio", "futuro", "blade runner"], ["fantascienza"], ["cerebrale", "oscuro", "filosofico"], ["mind-bending"]),
    (["romantico", "amore", "romance"], ["romance"], ["caldo", "emotivo"], ["soft"]),
    (["fantasy", "magia", "mito"], ["fantasy"], ["epico", "meraviglia"], ["immersive"]),
    (["veloce", "adrenalina", "azione"], ["azione", "thriller"], ["teso", "dinamico"], ["fast-paced"]),
]

FOLLOW_UPS = [
    "Lo vuoi piu disturbante o piu elegante?",
    "Preferisci ritmo lento o tensione continua?",
    "Vuoi qualcosa di emotivo o piu cerebrale?",
    "Quanto deve essere pesante da 1 a 5?",
]


def _category_from_text(text: str) -> str:
    lowered = text.lower()
    for key, value in CATEGORY_ALIASES.items():
        if key in lowered:
            return value
    return "book"


def local_intent_from_messages(message: str, history: list[AiChatMessage]) -> IntentData:
    combined = " ".join([entry.content for entry in history] + [message]).lower()
    category = _category_from_text(combined)
    genres: list[str] = []
    moods: list[str] = []
    energy: list[str] = []
    avoid: list[str] = []
    for keys, group_genres, group_moods, group_energy in SIGNAL_GROUPS:
        if any(key in combined for key in keys):
            genres.extend(group_genres)
            moods.extend(group_moods)
            energy.extend(group_energy)
    if "legger" in combined or "comfort" in combined:
        avoid.extend(["disturbante", "pesante", "horror"])
    if "nascosto" in combined or "non mainstream" in combined:
        mainstream = "low"
    elif "mainstream" in combined or "popolare" in combined:
        mainstream = "high"
    else:
        mainstream = "medium"
    intensity = 4 if any(word in combined for word in ["pesante", "disturbante", "dark", "inquietante"]) else 3
    genres = list(dict.fromkeys(genres or ["dramma"]))
    moods = list(dict.fromkeys(moods or ["emotivo", "cinematografico"]))
    energy = list(dict.fromkeys(energy or ["immersive"]))
    required_tags = [*genres[:2], *moods[:2]]
    boost_tags = [*moods, *energy]
    return IntentData(
        session_title="Deriva " + ("oscura" if "oscuro" in moods or "disturbante" in moods else "personale"),
        user_intent_summary=f"Ti preparo una sessione {', '.join(moods[:3])}, costruita intorno a quello che hai scritto.",
        category=category,
        genres=genres,
        moods=moods,
        energy=energy,
        avoid=list(dict.fromkeys(avoid)),
        mainstream_level=mainstream,
        intensity=intensity,
        follow_up_questions_completed=len(history) >= 4,
        feed_query=IntentFeedQuery(category=category, required_tags=required_tags, boost_tags=boost_tags, exclude_tags=avoid),
    )


class AiIntentService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.provider = (self.settings.llm_provider or "local").lower()
        self.client = AsyncOpenAI(api_key=self.settings.openai_api_key) if self.settings.openai_api_key else None

    async def interpret(self, message: str, history: list[AiChatMessage]) -> tuple[str, str, list[str], IntentData]:
        use_openai = self.client and self.provider == "openai"
        if use_openai:
            try:
                return await self._openai_interpret(message, history)
            except Exception:
                pass
        intent = local_intent_from_messages(message, history)
        completed = len(history) >= 4
        questions = [] if completed else FOLLOW_UPS[: max(1, 3 - len(history) // 2)]
        assistant = (
            f"Ho capito il mood. {intent.user_intent_summary}"
            if completed
            else "Ti seguo. Prima di aprire la sessione, dimmi due dettagli veloci."
        )
        intent.follow_up_questions_completed = completed
        return ("local", assistant, questions, intent)

    async def _openai_interpret(self, message: str, history: list[AiChatMessage]) -> tuple[str, str, list[str], IntentData]:
        chat_lines = "\n".join(f"{entry.role}: {entry.content}" for entry in history[-8:])
        prompt = f"""
Sei GAAS, un sistema premium di scoperta culturale. Rispondi in italiano, breve, cinematografico.
Interpreta il desiderio dell'utente e restituisci SOLO JSON valido con chiavi:
assistant_message, questions, ready_to_start, intent.
intent deve avere: session_title, user_intent_summary, category(movie|tv|anime|game|book|podcast),
genres, moods, energy, avoid, mainstream_level(low|medium|high), intensity(1-5),
follow_up_questions_completed, feed_query(category, required_tags, boost_tags, exclude_tags).
Fai massimo 3 domande brevi se mancano informazioni. Se la conversazione basta, ready_to_start=true.
Conversazione:
{chat_lines}
user: {message}
"""
        response = await self.client.responses.create(
            model=self.settings.openai_model,
            input=prompt,
            temperature=0.4,
        )
        raw = response.output_text.strip()
        data = json.loads(raw[raw.find("{") : raw.rfind("}") + 1])
        intent = IntentData.model_validate(data["intent"])
        return ("openai", data["assistant_message"], data.get("questions", []), intent)
