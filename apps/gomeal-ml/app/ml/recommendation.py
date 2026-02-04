class RecommendationEngine:
    def __init__(self):
        print("Recommendation engine loaded")

    def recommend(self, user_id: str):
        return [
            "Spicy Chicken Bowl",
            "Creamy Pasta",
            "Vegan Stir Fry"
        ]
