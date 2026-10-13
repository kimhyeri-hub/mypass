import io
import re

import edge_tts
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

VOICES = {
    "male": "ko-KR-InJoonNeural",
    "female": "ko-KR-SunHiNeural",
}
DEFAULT_GENDER = "male"
RATE = "+0%"
PITCH = "+0Hz"

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def clean_text(text: str) -> str:
    text = re.sub(r"[*_`#>]+", "", text)
    text = re.sub(r"\s*\n+\s*", " ", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


class TtsRequest(BaseModel):
    text: str
    voice: str = DEFAULT_GENDER


@app.get("/health")
def health():
    return {"ok": True, "voices": VOICES, "default": DEFAULT_GENDER}


@app.post("/tts")
async def tts(req: TtsRequest):
    text = clean_text(req.text)
    if not text or len(text) > 600:
        raise HTTPException(400, "텍스트가 비었거나 너무 깁니다.")
    voice = VOICES.get(req.voice, VOICES[DEFAULT_GENDER])
    buf = io.BytesIO()
    try:
        async for chunk in edge_tts.Communicate(text, voice, rate=RATE, pitch=PITCH).stream():
            if chunk["type"] == "audio":
                buf.write(chunk["data"])
    except Exception as e:
        raise HTTPException(502, f"음성 생성 실패: {e}")
    if buf.tell() == 0:
        raise HTTPException(502, "음성 데이터가 비어 있습니다.")
    return Response(content=buf.getvalue(), media_type="audio/mpeg")
