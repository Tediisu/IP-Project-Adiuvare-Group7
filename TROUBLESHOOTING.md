# Running & Troubleshooting

## Running the project

### Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/), **open and running**
  (the whale icon in the taskbar says "Docker Desktop is running")

You don't need Python or Node.js installed. Docker provides both.

### Start

From the project root (`Scheduling-Planner/`):

```powershell
docker compose up --build
```

Keep this terminal open. It shows logs from both services. Wait until you see:

```
backend-1   | INFO:     Application startup complete.
frontend-1  |   ➜  Local:   http://localhost:5173/
```

Then open:

| What        | URL                                   |
| ----------- | ------------------------------------- |
| App         | http://localhost:5173                 |
| API health  | http://localhost:8000/api/health      |
| API docs    | http://localhost:8000/docs            |

(If you changed `BACKEND_PORT` in `.env`, replace `8000` with your port.)

To run in the background instead, add `-d`: `docker compose up --build -d`.
View logs with `docker compose logs -f`.

### While developing

- Code changes reload automatically. `backend/app/` and `frontend/` are mounted
  into the containers, so you don't need to rebuild.
- **Rebuild** (`docker compose up --build`) only after changing
  `backend/requirements.txt`, `frontend/package.json`, or a `Dockerfile`.
- Items are stored in memory, so they're **lost whenever the backend restarts**.

### Stop

- If running in the foreground: press **Ctrl+C**, then run `docker compose down`.
- If running in the background: `docker compose down`.

### Do's and don'ts

- ✅ Start and stop both services together (`docker compose up` / `docker compose down`).
- ❌ Don't stop or start just one container from Docker Desktop.
- ❌ Don't run `docker compose up frontend` by itself.
- ❌ Don't run `npm run dev` on its own unless the backend is also running on port 8000.

Each of these leaves the frontend running without a backend, which gives **Bad Gateway** (below).

### Quick check that everything is running

```powershell
docker compose ps
```

Both `scheduling-planner-backend-1` and `scheduling-planner-frontend-1` should show `Up`.

---

# Troubleshooting

## "Bad Gateway" (HTTP 502) in the app

### Symptom

The frontend loads at http://localhost:5173, but API calls fail with **Bad Gateway**.
The frontend logs show:

```
[vite] http proxy error: /api/items
Error: getaddrinfo ENOTFOUND backend
```

(`EAI_AGAIN backend` is the same problem.)

### Cause

The frontend sends every `/api/*` request through the Vite dev server, which passes
it to the backend at `http://backend:8000` (see `frontend/vite.config.ts`). When the
backend container isn't running, the name `backend` no longer exists on the Docker
network. Vite can't reach the backend and returns **502 Bad Gateway**.

This happens when the backend is stopped while the frontend keeps running, for example:

- stopping only the backend in Docker Desktop
- running `docker compose up frontend` by itself
- the backend failing to start (see the port conflict below)

### Fix

Start and stop both services together:

```powershell
docker compose down
docker compose up --build
```

Check that both containers are `Up`:

```powershell
docker compose ps
```

and that the backend responds at http://localhost:8000/api/health (expected: `{"status":"ok"}`).

---

## "Bind for 0.0.0.0:8000 failed: port is already allocated"

### Symptom

`docker compose up` builds everything, then fails with:

```
Error response from daemon: failed to set up container networking: ...
Bind for 0.0.0.0:8000 failed: port is already allocated
```

The backend doesn't start, so the frontend returns **Bad Gateway** (see above).

### Cause

Something else is already using port 8000. Usually it's a container from **another
Docker project** (for example `adiuvare-backend-1`) that starts automatically with
Docker Desktop.

### Find what's using the port

```powershell
docker ps --filter "publish=8000"
netstat -ano | findstr :8000
```

- If `docker ps` lists a container, another Docker project owns the port.
- If only `netstat` shows it, the last column is a process ID (PID). Check it with
  `Get-Process -Id <PID>`. If it's `python` or `uvicorn`, it's a backend running outside Docker.

### Fix A: Stop the other container

```powershell
docker stop <container-name>
docker compose up --build
```

To keep it from starting automatically with Docker Desktop:

```powershell
docker update --restart=no <container-name>
```

To start it again later: `docker start <container-name>`.

### Fix B: Run this project on a different port (recommended to run both)

Create a `.env` file in the project root (it's already in `.gitignore`):

```
BACKEND_PORT=8001
```

Then run `docker compose up --build`. The app still works at http://localhost:5173,
because the frontend reaches the backend over the internal Docker network. Only the
URL for the backend in your browser changes, to http://localhost:8001.

If port 5173 also conflicts, add `FRONTEND_PORT=5174` to `.env` and change
`CORS_ORIGINS` in `docker-compose.yml` to `http://localhost:5174`.

---

## Too many old images in Docker Desktop

### Cause

Each `docker compose up --build` builds new images. The old ones lose their name and
stay on disk as `<none>` (or a bare `sha256:...` hash).

### Fix

Remove this project's containers and images, then rebuild:

```powershell
docker compose down --rmi all --remove-orphans
docker ps -aq --filter "name=scheduling-planner" | ForEach-Object { docker rm -f $_ }
docker images "scheduling-planner*" -q | ForEach-Object { docker rmi -f $_ }
docker image prune -f
docker builder prune -f   # optional: frees up the build cache
docker compose up --build
```

`docker image prune -f` removes unnamed images from **every** project. They're unused,
so this is normally safe.

To keep it tidy, run `docker image prune -f` from time to time.



Docker isn't tied to the folder you're in. Containers run in Docker Desktop for your whole computer, not inside a folder. Both Adiuvare containers (adiuvare-backend-1 and adiuvare-db-1) have their restart policy set to restart=always. That's why Docker Desktop started them automatically this morning around 05:15 UTC, even though you never ran anything in C:\Users\Iggy\Documents\Adiuvare. The backend took port 8000 before your project could.

I tried to turn off their auto-start and stop them, but the permission system blocked me because they belong to another project. You can run it yourself from this prompt:

! docker update --restart=no adiuvare-backend-1 adiuvare-db-1; docker stop adiuvare-backend-1 adiuvare-db-1

Then start this project:

docker compose up

- docker update --restart=no stops them from auto-starting every time Docker Desktop opens. It doesn't delete anything; the containers and the database data stay.
- docker stop frees port 8000 right now.

The Adiuvare project's own compose file probably has restart: always in it. If you run docker compose up in that folder later, the setting will come back, so remove that line there if you don't want it.

If you'd rather leave Adiuvare alone, you can run this project on a different port instead: $env:BACKEND_PORT=8001; docker compose up