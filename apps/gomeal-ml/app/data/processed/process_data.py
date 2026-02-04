from dotenv import load_dotenv
from typing import List
from collections import defaultdict
from datetime import datetime
import os
import pandas as pd
import json
import sys
load_dotenv()
RAW_DIR = os.getenv("RAW_DIR")
PROCESSED_DIR = os.getenv("PROCESSED_DIR")
from app.utils.model import UserAction, UserEngagement, Recipe, Nutrition, Ingredient, Dietary

def safe_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None

# Get dataset paths name 
def get_dataset_files():
    dataset_files = []
    for dataset_name in os.listdir(RAW_DIR):
        dataset_path = os.path.join(RAW_DIR, dataset_name)
        if os.path.isdir(dataset_path):
            for f in os.listdir(dataset_path):
                if f.endswith((".csv", ".json")):
                    dataset_files.append((dataset_name, os.path.join(dataset_path, f)))
    return dataset_files

# Load single folder dataset
def load_dataset(file_path, nrows=None):
    if file_path.endswith(".csv"):
        sep = ';' if file_path.endswith("dataset.csv") else ","
        df = pd.read_csv(file_path, nrows=nrows, sep=sep, dtype=str, quotechar='"', escapechar='\\', engine='python')
    elif file_path.endswith(".json"):
        with open (file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        df = pd.json_normalize(data)
        if nrows:
            df =df.head(nrows)
    else:
        raise ValueError("Unsupported dataset file type:", file_path)
    return df

# Load multiple folder datasets(multiple csv files or JSON)
def load_datasets_grouped(datasets, nrows=None):
    grouped_data = defaultdict(dict)  # dataset_name -> {file_key: DataFrame}

    for dataset_name, path in datasets:
        # use the filename (without extension) as a unique key per file
        file_key = os.path.splitext(os.path.basename(path))[0]
        df = load_dataset(path, nrows=nrows)
        grouped_data[dataset_name][file_key] = df

    return grouped_data

# extrapolate first column(attributes)
def extract_dataset_attributes(grouped_data):
    dataset_attributes = defaultdict(dict)
    for dataset_name, files_dict in grouped_data.items():
        for file_key, df in files_dict.items():
            if not df.empty:
                dataset_attributes[dataset_name][file_key] = list(df.columns)
            else:
                dataset_attributes[dataset_name][file_key] = []

    return dataset_attributes


## Normalizations
def normalize_recipe_row(row: dict) -> Recipe:
    ingredients_list = []
    raw_ingredients = row.get("Cleaned_Ingredients", [])
    for ing in raw_ingredients:
        if isinstance(ing, dict):
            ingredients_list.append(Ingredient(**ing))
        else:
            ingredients_list.append(Ingredient(name=ing))

    # Nutrition might be a dict string
    nutrition_data = row.get("Nutrition", {})
    if isinstance(nutrition_data, str):
        nutrition_data = eval(nutrition_data) 

    nutrition = Nutrition(
        calories_per_serving=safe_float(nutrition_data.get("Calories")),
        carbs_g=safe_float(nutrition_data.get("Carbohydrates")),
        protein_g=safe_float(nutrition_data.get("Protein")),
        fat_g=safe_float(nutrition_data.get("Fat")),
        sugar_g=safe_float(nutrition_data.get("Sugar")),
        fiber_g=safe_float(nutrition_data.get("Fiber")),
        sodium_mg=safe_float(nutrition_data.get("Sodium")),
    )

    recipe = Recipe(
        dish_name=row.get("Title", ""),
        description=row.get("Instructions", ""),
        difficulty="medium", 
        image_url=row.get("Image_Name"),
        ingredients=ingredients_list,
        steps=row.get("Instructions", "").split("\n"),
        nutrition=nutrition,
        dietary=Dietary() 
    )

    return recipe

def normalize_user_action(row: dict) -> UserAction:
    if "review" in row and row["review"]:
        action_type = "sent_message"
    elif "rating" in row and row["rating"]:
        action_type = "clicked_post"
    else:
        action_type = "opened_notification"

    metadata = {}
    if "rating" in row:
        metadata["rating"] = float(row["rating"])
    if "review" in row:
        metadata["review"] = row["review"]

    return UserAction(
        user_sub=str(row.get("user_id")),
        target_type="post",  
        target_id=int(row.get("recipe_id")) if row.get("recipe_id") else None,
        action_type=action_type,
        created_at=row.get("date"),
        metadata=metadata,
        action_weight=1.0,
        action_summary=None,
        context={}
    )

def aggregate_user_engagement(actions: list[UserAction]) -> dict[str, UserEngagement]:
    engagement_dict = defaultdict(lambda: UserEngagement(user_sub=""))
    
    for action in actions:
        u = action.user_sub
        if not engagement_dict[u].user_sub:
            engagement_dict[u].user_sub = u

        if action.action_type == "clicked_post":
            engagement_dict[u].post_clicks += action.action_weight
        elif action.action_type == "liked_post":
            engagement_dict[u].post_likes += action.action_weight
        elif action.action_type == "sent_message":
            engagement_dict[u].messages_sent += action.action_weight
        elif action.action_type == "opened_notification":
            engagement_dict[u].notifications_opened += action.action_weight

    return dict(engagement_dict)