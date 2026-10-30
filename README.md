# ChefNex

ChefNex is GoMeal's real-time food-vision inference service. It receives an authenticated camera frame, identifies visible food, grounds each detection in the image, resolves known ingredients against the catalog, expands prepared dishes into likely components when necessary, and finds visually similar posts.

## What it does

- Detects distinct edible foods visible in an image.
- Returns bounding boxes and confidence scores for detected items.
- Matches food names to the ingredient catalog with semantic vector search.
- Infers common core ingredients for prepared foods with low-confidence catalog matches.
- Retrieves visually similar active GoMeal posts.
- Delivers results to the client in real time over Socket.IO.

## Architecture

```text
Authenticated client
        |
        | image_frame (Socket.IO)
        v
FastAPI + Socket.IO server
        |
        v
ImageAnalysis orchestrator
  |       |          |                 |
  |       |          |                 +--> CLIP image embedding
  |       |          |                         |
  |       |          |                         v
  |       |          |                    pgvector post search
  |       |          |
  |       |          +--> OWL-V2 grounding --> bounding boxes
  |       |
  |       +--> BGE text embedding --> pgvector ingredient search
  |
  +--> Qwen3-VL visible-food detection
                 |
                 +--> ingredient expansion for weak dish matches
                          |
                          v
                   OpenAI-compatible LLM
```

## Models

| Purpose | Default model | How ChefNex uses it |
| --- | --- | --- |
| Visible-food detection | `Qwen/Qwen3-VL-4B-Instruct` | Identifies distinct foods actually visible in a frame. |
| Object grounding | `google/owlv2-base-patch16-ensemble` | Converts food labels into bounding boxes and scores. |
| Ingredient semantic matching | `BAAI/bge-base-en-v1.5` | Embeds food text for nearest-neighbor lookup in the ingredient catalog. |
| Similar-post retrieval | `openai/clip-vit-large-patch14-336` | Creates image embeddings for visual similarity search. |
| Dish component expansion | `qwen3-4b-instruct-2507` | Infers common core ingredients for prepared dishes through an OpenAI-compatible endpoint. |

The model names are configurable through environment variables. The component-expansion model uses the value of `LLM_MODEL` when configured; otherwise it falls back to the model above.

## Image-analysis flow

1. The client connects with a JWT and emits an `image_frame` event.
2. The service verifies the token and prevents concurrent processing for the same session.
3. Qwen3-VL returns a JSON list of visible food items.
4. ChefNex embeds each item and searches the ingredient catalog through PostgreSQL and pgvector.
5. Exact or high-confidence ingredient matches are kept. Weak or missing dish matches are expanded into typical components with the configured LLM, then resolved against the catalog in a batch.
6. OWL-V2 grounds the candidate food labels in the image and returns bounding boxes.
7. CLIP embeds the frame and pgvector retrieves similar active posts.
8. The service emits a `frame_results` event containing detected items and similar post IDs.

ChefNex deliberately separates visible detection from culinary inference: detected foods are based on the image, while dish components are an explicit inferred fallback.

## Requirements

- Python 3.11 or later
- PostgreSQL with the `pgvector` extension and the GoMeal ingredient/post embedding tables
- Access to the configured Hugging Face model weights
- An OpenAI-compatible endpoint for prepared-dish component expansion
- CPU, Apple Silicon, or CUDA-capable hardware. CUDA is used automatically where available; OWL-V2 also supports MPS.

## Setup

Create and activate a virtual environment, then install dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file. Do not commit it.

```dotenv
# Server
BACK_END_PORT=6970

# Authentication
JWT_ACCESS_SECRET=replace-with-a-secure-secret

# PostgreSQL / pgvector
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=your-database-name
DB_USER=your-database-user
DB_PASSWORD=your-database-password

# Text embedding model
MODEL_NAME=BAAI/bge-base-en-v1.5
MODEL_DEVICE=cpu

# Image similarity model
CLIP_MODEL=openai/clip-vit-large-patch14-336

# Image analysis models
VLM_MODEL=Qwen/Qwen3-VL-4B-Instruct
IMAGE_MODEL=google/owlv2-base-patch16-ensemble
# Optional: cpu, mps, or cuda
IMAGE_MODEL_DEVICE=cpu

# Prepared-dish component expansion
LLM_BASE_URL=http://host.docker.internal:1234/v1
LLM_API_KEY=lm-studio
```

Start the service:

```bash
python -m server
```

The health endpoint is available at `GET /health`:

```json
{"status":"ok"}
```

## Socket.IO API

### Connect

Clients must send a valid JWT in the Socket.IO authentication payload:

```javascript
io("http://localhost:6970", {
  auth: { token: "<jwt>" }
});
```

Connections without a valid, unexpired token are rejected.

### Send an image frame

Emit `image_frame` with raw image bytes and frame metadata:

```javascript
socket.emit("image_frame", {
  data: imageBytes,
  width: 1280,
  height: 720,
  pixel_format: "rgb"
});
```

Only one frame may be processed at a time per socket session. A second simultaneous frame receives `frame_already_processing`.

### Receive results

Listen for `frame_results`:

```javascript
socket.on("frame_results", ({ items, similar_post_ids }) => {
  console.log(items, similar_post_ids);
});
```

`items` contains the grounded food detections and any resolved or inferred component data. `similar_post_ids` contains up to 10 matching active-post IDs by default.

On processing failure, the service emits:

```javascript
socket.on("detect_error", ({ message }) => {
  console.error(message); // "detect_failed"
});
```

## Docker

Build and run the service:

```bash
docker build -t chefnex .
docker run --env-file .env -p 6970:6970 chefnex
```

When running the component-expansion endpoint on the Docker host, confirm that the configured `LLM_BASE_URL` is reachable from the container.

## Observability and V2

ChefNex logs model loading, detection, grounding, component expansion, and similar-post retrieval. As GoMeal enters V2, pair those operational signals with product analytics to measure analysis completion, inference latency, detection confidence, ingredient-result engagement, similar-post click-through, and retention. Use these metrics to prioritize model, retrieval, and user-experience improvements.

## Security notes

- Authenticate every Socket.IO connection with JWT validation.
- Keep model, database, and API credentials in environment variables only.
- Restrict CORS and Socket.IO allowed origins to trusted production clients before deployment.
- Avoid logging raw frames, tokens, or personally identifiable data.
