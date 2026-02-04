class LLMGenerator:
    def __init__(self):
        print("LLM generator loaded")

    def generate_caption(self, recipe: str):
        return f"You are going to love this {recipe}. Simple. Delicious."
