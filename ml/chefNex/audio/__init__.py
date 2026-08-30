from chefNex.intent import Intent
from chefNex.session.state import SessionState

from chefNex.audio.voice_input import VoiceInput
from chefNex.audio.speech_to_text import SpeechToText
from chefNex.intent.intent_router import IntentRouter
from chefNex.agents.registry import AgentManager


def main():
    
    voice = VoiceInput()
    stt = SpeechToText()
    router = IntentRouter()
    agents = AgentManager()
    session = SessionState()   # one per run — swap this for per-user persistence later

    print("🍳 ChefNex is ready!")

    while True:
        audio = voice.listen()
        if audio is None:
            continue

        text = stt.transcribe(audio)
        if not text:
            continue

        print(f"\n🧑 You: {text}")

        prediction = router.classify(text)
        intent = prediction.intent
        print(f"🧠 Intent: {intent.value} (margin={prediction.confidence:.3f})")

        response = agents.run(intent, text, session=session)
        print(f"🤖 ChefNex: {response}\n")


if __name__ == "__main__":
    main()