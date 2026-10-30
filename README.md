# GoMeal Backend

Backend services for GoMeal, a meal tracking and recipe discovery application. The repository contains the main API, a machine-learning service for embeddings and feed ranking, and a Redis service for caching and realtime features.

## Services

| Service | Technology | Default port | Responsibilities |
| --- | --- | ---: | --- |
| `server/` | Node.js 22, Express 5, TypeScript, Socket.IO | `3000` | Application API, authentication, users, posts, feed, cooking and grocery features, messaging, notifications, and scheduled jobs |
| `ml/` | Python 3.11, FastAPI, Socket.IO | `6969` | Text and image embeddings, personalized feed ranking, trends, and recommendation-related processing |
| `redis` | Redis 7 | `6379` | Cache and realtime support used by the services |

The API also integrates with PostgreSQL and AWS services (including S3, SES, and Cognito). Some features use external providers such as Walmart, Apple Push Notifications, and the USDA FoodData Central API.

## Requirements

- Docker and Docker Compose (recommended), or Node.js 22 and Python 3.11 to run services directly
- PostgreSQL accessible to the backend
- Service credentials and configuration for the integrations you use

## Configuration

Docker Compose reads `config.env` and `server/.env` for the API, and `ml/.env` for the ML service. Create these files locally; do not commit secrets. The repository does not include a complete environment template.

Common settings include:

| Variable | Used by | Purpose |
| --- | --- | --- |
| `PORT` | API / ML | Listening port; defaults to `3000` / `6969` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | API / ML | PostgreSQL connection |
| `REDIS_HOST`, `REDIS_PORT` | API / ML | Redis connection; Compose service hostname is `redis` |
| `ML_HOST`, `ML_PORT` | API | ML service address; defaults to `ml:6969` |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | API | Token signing secrets |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | API / ML | AWS SDK credentials and region |

Other features may require additional variables, including model names and device settings, embedding dimensions, bucket names, OAuth client IDs, Apple push credentials, email sender, and third-party API keys. Check the relevant service under `server/app/services/`, `server/app/routes/`, or `ml/` for the exact settings it reads.

## Run with Docker Compose

1. Create and fill in `config.env`, `server/.env`, and `ml/.env` with the values required for your setup.
2. Start the services:

   ```sh
   docker compose up --build
   ```

3. Check service health:

   ```sh
   curl http://localhost:3000/health
   curl http://localhost:6969/health
   ```

The ML container loads its models and brain during startup, so its health endpoint may not be ready immediately. PostgreSQL is not included in the Compose file and must be provided separately. The Compose file also does not currently enforce startup ordering between the API, ML service, and Redis.

Stop the services with `docker compose down`.

## Run services locally

Start Redis and make PostgreSQL available first. Then run the API:

```sh
cd server
npm install
npm run server
```

In a separate terminal, install and start the ML service:

```sh
cd ml
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python server.py
```

Set the same configuration variables in the environment or in the service dotenv files before starting. On Windows, activate the virtual environment with `.venv\\Scripts\\activate`.

## API and realtime overview

The Express API mounts route groups for authentication, users, posts, feeds, search, cooking, grocery carts, messaging, and web/newsletter features. Authenticated endpoints use the token middleware. The API also exposes Socket.IO for realtime features and starts scheduled jobs when the server starts.

The ML service exposes FastAPI routes for health checks, embeddings, ranking, and trends, and attaches a Socket.IO ASGI application. Its ranking and trend logic is initialized asynchronously at startup.

Both HTTP services expose `GET /health`. For route details and request/response shapes, see the route files in `server/app/routes/` and `ml/routes/router.py`.

## Project layout

```text
server/                 Express API and Socket.IO server
  app/routes/           HTTP and realtime route handlers
  app/services/         Database, Redis, ML, AWS, and provider clients
ml/                     FastAPI ML and recommendation service
  routes/               Embedding, feed, user, and post endpoints
  brain/                Ranking and recommendation components
  jobs/                 Background refresh jobs
docker-compose.yml      Local multi-service setup
```

## Development notes

- The API entry point is `server/server.ts`; the ML entry point is `ml/server.py`.
- The API npm scripts currently provide `npm run server`; there is no test or lint script defined in `server/package.json`.
- The Compose file publishes the API, ML, and Redis ports to the host. Use suitable secrets and network controls for deployments.
