from chefNex.runtime import Runtime
from chefNex.input import Conversation


runtime = Runtime()

conversation = Conversation.create(
    user_id="53",
)

if conversation is None:
    raise RuntimeError("Failed to create conversation")

text = input("You: ")

message = runtime.run(
    text,
    conversation=conversation,
)

if message is not None:
    print(f"ChefNex: {message.content}")