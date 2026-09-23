# Adiuvare — Scheduling Website

A full-stack scheduling app for managing weekly class/course schedules. Built with Vite + React (TypeScript) on the frontend, FastAPI on the backend, and MySQL for storage — fully containerized with Docker.

## Tech Stack

- **Frontend:** Vite, React, TypeScript, React Router
- **Backend:** FastAPI, SQLAlchemy, PyMySQL
- **Database:** MySQL 8.0
- **Containerization:** Docker & Docker Compose

## Prerequisites

Make sure the following are installed on the machine you're cloning to:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- [Git](https://git-scm.com/downloads)

You do **not** need Node.js, Python, or MySQL installed locally — everything runs inside containers.

## 1. Clone the repository

```bash
git clone https://github.com/<your-username>/<your-repo>.git](https://github.com/Tediisu/Adiuvare.git
cd Adiuvare
```

## 2. Set up environment variables

This project uses a `.env` file at the project root for secrets and config. It is **not** committed to Git for security reasons, so you need to create your own from the provided template.

```bash
cp .env.example .env
```

On Windows (PowerShell):
```powershell
copy .env.example .env
```

Open the new `.env` file and fill in your own values (or keep the defaults for local development):

```env
# MySQL
MYSQL_ROOT_PASSWORD=rootpass
MYSQL_DATABASE=scheduler
MYSQL_USER=scheduler_user
MYSQL_PASSWORD=scheduler_pass

# Backend
DATABASE_URL=mysql+pymysql://scheduler_user:scheduler_pass@db:3306/scheduler

# Frontend (build-time)
VITE_API_URL=http://localhost:8000
```

> ⚠️ Never commit your real `.env` file. Only `.env.example` (with placeholder values) should be pushed to GitHub.

## 3. Build and run with Docker Compose

From the project root (where `docker-compose.yml` lives):

```bash
docker compose up --build
```

This will:
1. Pull and start a MySQL 8.0 container, initializing the `scheduler` database
2. Build the FastAPI backend image and start it once MySQL is healthy
3. Build the React frontend (Vite production build) and serve it via nginx

First build may take a few minutes as it downloads base images and installs dependencies.

## 4. Access the app

Once all containers are up:

| Service | URL |
|---|---|
| Frontend (landing + schedule) | http://localhost:5173 |
| Backend API (Swagger docs) | http://localhost:8000/docs |
| MySQL (if connecting via a DB client) | `localhost:3306` |

## 5. Stopping the app

```bash
docker compose down
```

To also wipe the database volume (fresh start next time):
```bash
docker compose down -v
```

## Development mode (hot-reload)

The default `docker-compose.yml` builds the **production** frontend (static build served by nginx) — good for testing a real deploy, but it won't hot-reload on file changes.

For active development with hot-reload, use the dev Dockerfile instead. Either:

**Option A — swap the frontend service to use `Dockerfile.dev`:**
```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile.dev
  ports:
    - "5173:5173"
  volumes:
    - ./frontend:/app
    - /app/node_modules
  depends_on:
    - backend
```

**Option B — run the frontend locally outside Docker** (if you have Node.js installed):
```bash
cd frontend
npm install
npm run dev
```

The backend can still run in Docker either way — just make sure `VITE_API_URL` in your `.env` or frontend `.env.local` points to `http://localhost:8000`.

## Project Structure

```
scheduler/
├── .env                  # your local secrets (not committed)
├── .env.example          # template for required env vars
├── .gitignore
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py            # FastAPI app + routes
│   ├── database.py        # SQLAlchemy engine/session setup
│   ├── models.py          # Course table definition
│   └── schemas.py         # Pydantic request/response schemas
└── frontend/
    ├── Dockerfile          # production build (nginx-served)
    ├── Dockerfile.dev      # dev server with hot-reload
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── main.tsx
        ├── App.tsx         # route definitions
        ├── routes/
        │   ├── LandingPage.tsx
        │   └── SchedulePage.tsx
        ├── components/
        │   ├── AddItemModal.tsx
        │   └── ManageSchedulesModal.tsx
        └── styles/
            ├── LandingPage.css
            ├── SchedulePage.css
            └── AddItemModal.css
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/courses` | List all courses |
| POST | `/courses` | Create a new course |
| GET | `/courses/{id}` | Get a single course |
| PUT | `/courses/{id}` | Update a course |
| DELETE | `/courses/{id}` | Delete a course |

Full interactive API documentation is available at http://localhost:8000/docs once the backend is running.

## Course Data Model

| Field | Type | Required |
|---|---|---|
| `name` | string | ✅ |
| `hex_color` | string (`#RRGGBB`) | ✅ |
| `day` | enum (mon–sun) | ✅ |
| `start_time` | time | ✅ |
| `end_time` | time | ✅ |
| `course_type` | string | optional |
| `instructor` | string | optional |
| `location` | string | optional |

## Troubleshooting

**Backend can't connect to MySQL on first run**
MySQL may still be initializing internally even after Docker reports it "healthy." Restart just the backend:
```bash
docker compose restart backend
```

**Port already in use**
If `3306`, `8000`, or `5173` are occupied by another process on your machine, change the left-hand side of the port mapping in `docker-compose.yml`, e.g.:
```yaml
ports:
  - "5174:80"
```

**Frontend shows blank page or old content**
Rebuild without cache:
```bash
docker compose build --no-cache frontend
docker compose up
```

**Installed a new npm package but container doesn't see it**
If using the dev setup with a mounted volume, install inside the container, not just on your host:
```bash
docker compose exec frontend npm install <package-name>
```

## License

Specify your license here (e.g. MIT) or note this is a school/capstone project not intended for redistribution.
