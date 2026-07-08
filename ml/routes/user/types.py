from enum import Enum

class ActionType(Enum):
    CREATE_POST = "CREATE_POST"
    LIKE_POST = "LIKE_POST"
    COOK_POST = "COOK_POST"
    DELETE_POST = "DELETE_POST"
    VIEW_POST = "VIEW_POST"
    SHARE_POST = "SHARE_POST"
    STAR_POST = "STAR_POST"

SEEN_POST_ACTIONS = {
    ActionType.LIKE_POST.value,
    ActionType.COOK_POST.value,
    ActionType.VIEW_POST.value,
    ActionType.SHARE_POST.value,
    ActionType.STAR_POST.value,
}

ACTION_WEIGHTS: dict[str, float] = {
    ActionType.CREATE_POST.value: 3.0,
    ActionType.LIKE_POST.value: 1.5,
    ActionType.COOK_POST.value: 5.0,
    ActionType.VIEW_POST.value: 0.5,
    ActionType.DELETE_POST.value: -3.0,
    ActionType.SHARE_POST.value: 2.0,
    ActionType.STAR_POST.value: 2.5,
}