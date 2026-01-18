# Docker Configuration Master Guide - Line by Line Analysis

This document provides an **explicit, line-by-line explanation** of the "Professional & Optimal" Docker setup implemented for your project.

---

## 1. Docker Compose (`docker-compose.yml`)

This file orchestrates the entire application stack.

```yaml
services:
```
**Line 1**: Starts the definition of services (containers) that make up your application.

### Service 1: Database (`db`)
```yaml
  db:
    image: postgres:15-alpine
    restart: always
```
**Lines 3-5**: Defines the `db` service using the `postgres:15-alpine` image (a lightweight Linux version). `restart: always` ensures the DB automatically restarts if it crashes or the server reboots.

```yaml
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      POSTGRES_DB: inventory
```
**Lines 6-9**: Sets environment variables.
- `POSTGRES_USER`: The username for the database.
- `POSTGRES_PASSWORD_FILE`: **Crucial Security Feature**. Instead of putting the password directly in the file, we tell Postgres to read it from a file at `/run/secrets/db_password`.
- `POSTGRES_DB`: The name of the default database to create.

```yaml
    volumes:
      - postgres_data:/var/lib/postgresql/data
```
**Lines 10-11**: Mounts a named volume `postgres_data` to the container's data directory. This ensures data persists even if the container is deleted.

```yaml
    secrets:
      - db_password
```
**Lines 12-13**: Grants this service access to the `db_password` secret defined at the bottom of the file.

```yaml
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.1'
          memory: 128M
```
**Lines 14-21**: **Resource Management**.
- `limits`: The container is *hard limited* to 0.5 CPU cores and 512MB RAM. It cannot use more.
- `reservations`: The system guarantees at least 0.1 CPU and 128MB RAM are available for it.

```yaml
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d inventory"]
      interval: 5s
      timeout: 5s
      retries: 5
```
**Lines 22-26**: **Self-Healing**. Docker runs this command every 5s. If it fails 5 times, the container is marked "unhealthy".

```yaml
    networks:
      - backend-tier
```
**Lines 27-28**: Connects the DB to the `backend-tier` network. It is NOT accessible from the frontend network.

```yaml
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```
**Lines 29-33**: **Log Rotation**. Prevents logs from filling up the disk. Keeps max 3 files of 10MB each.

### Service 2: Redis (`redis`)
*(Similar structure to DB, skipping redundant explanations)*
```yaml
  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data
```
**Lines 36-40**: Uses Redis 7 Alpine image. Persists data to `redis_data` volume.

**Why use Redis?**
- **Speed**: It is an in-memory database, meaning it is incredibly fast (microseconds).
- **Caching**: We use it to store the results of expensive database queries. If a user asks for the same data twice, we serve it from Redis instantly instead of hitting the slower Database.
- **Queues**: It is the industry standard for managing background jobs (like sending emails or processing uploads) asynchronously.

```yaml
    deploy:
...
```

### Service 5: Proxy (`proxy`)
```yaml
  proxy:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
```
**Lines 121-125**: Uses Nginx. Mounts our custom config file as Read-Only (`:ro`).

**Why use Nginx (Proxy)?**
- **Single Entrypoint**: It unifies your Frontend and Backend under one port (`8080`). The user doesn't need to know that the API is on port 8000 and the App is on port 3000.
- **Routing**: It intelligently directs traffic. Requests starting with `/api/` go to the Backend; everything else goes to the Frontend.
- **Performance**: Nginx is optimized for handling thousands of concurrent connections and serving static files much faster than application servers.
- **Security**: It acts as a shield, hiding your internal architecture from the public internet.

```yaml
    ports:
      - "8080:80"
```
**Lines 126-127**: **The Entrypoint**. Maps your computer's port 8080 to the container's port 80. You access the app at `http://localhost:8080`.

### Service 3: Backend (`backend`)
```yaml
  backend:
    image: arielpeit/inventory-backend
```
**Lines 60-61**: **Docker Hub Image**. We are now using the pre-built image `arielpeit/inventory-backend` from Docker Hub.

```yaml
    environment:
      DATABASE_URL: postgresql://user:password@db:5432/inventory
      REDIS_URL: redis://redis:6379/0
```
**Lines 67-69**: Connection strings. Note `db` and `redis` match the service names defined above (Docker DNS).

```yaml
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
```
**Lines 73-77**: **Startup Order**. The backend will NOT start until DB and Redis report they are "healthy" (not just running).

```yaml
    networks:
      - backend-tier
      - frontend-tier
```
**Lines 83-85**: The backend needs to talk to DB (backend-tier) AND be reached by the Proxy (frontend-tier).

### Service 4: Frontend (`frontend`)
```yaml
  frontend:
    image: arielpeit/inventory-frontend
```
**Lines 98-99**: **Docker Hub Image**. Similarly, we use the pre-built `arielpeit/inventory-frontend` image.

```yaml
    depends_on:
      backend:
        condition: service_healthy
```
**Lines 105-107**: **Startup Order**. The frontend waits for the backend to be fully healthy before starting. This prevents "connection refused" errors during startup.

```yaml
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:80"]
      interval: 10s
      timeout: 5s
      retries: 3
```
**Lines 113-117**: **Healthcheck**. We use `wget` (available in Alpine) to check if the web server is responding. This ensures the container is actually ready to serve traffic.

### Service 5: Proxy (`proxy`)
```yaml
  proxy:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
```
**Lines 121-125**: Uses Nginx. Mounts our custom config file as Read-Only (`:ro`).

```yaml
    ports:
      - "8080:80"
```
**Lines 126-127**: **The Entrypoint**. Maps your computer's port 8080 to the container's port 80. You access the app at `http://localhost:8080`.

```yaml
    depends_on:
      frontend:
        condition: service_healthy
      backend:
        condition: service_healthy
```
**Lines 128-132**: **Strict Dependencies**. The proxy will NOT start until both the frontend and backend are healthy. This ensures that when the proxy is up, the entire application is ready to accept traffic.

### Networks, Volumes, Secrets
```yaml
networks:
  frontend-tier:
  backend-tier:

volumes:
  postgres_data:
  redis_data:

secrets:
  db_password:
    file: ./secrets/db_password.txt
```
**Lines 144-154**:
- Defines the two networks.
- Defines the two persistent volumes.
- Defines the secret `db_password`, reading it from the local file `./secrets/db_password.txt`.

---

## 2. Backend Dockerfile (`backend/Dockerfile`)

```dockerfile
ARG PYTHON_VERSION=3.11-slim
```
**Line 2**: Defines a variable for the Python version. Default is 3.11-slim.

```dockerfile
FROM python:${PYTHON_VERSION} as builder
```
**Line 5**: **Stage 1 (Builder)**. Starts a temporary build stage.

```dockerfile
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
```
**Lines 10-11**: Python optimizations. Prevents `.pyc` files and ensures logs show up immediately.

```dockerfile
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
```
**Lines 13-14**: Creates a virtual environment at `/opt/venv` and adds it to PATH.

```dockerfile
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
```
**Lines 16-17**: Installs dependencies into the virtual environment.

```dockerfile
FROM python:${PYTHON_VERSION} as tester
...
RUN flake8 ...
RUN pytest
```
**Lines 20-33**: **Stage 2 (Tester)**. Copies the venv and runs tests. If this fails, the build stops.

```dockerfile
FROM python:${PYTHON_VERSION} as runner
```
**Line 36**: **Stage 3 (Runner)**. The final image. Starts fresh.

```dockerfile
LABEL maintainer="arielpeit" ...
```
**Lines 38-40**: Adds metadata to the image.

```dockerfile
RUN groupadd -r appuser && useradd -r -g appuser appuser
```
**Line 45**: **Security**. Creates a system user `appuser` so we don't run as root.

```dockerfile
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY . .
```
**Lines 47-50**: Copies the *installed dependencies* (venv) from the Builder stage and the application code.

```dockerfile
RUN chown -R appuser:appuser /app
USER appuser
```
**Lines 53-55**: Changes file ownership to the non-root user and switches to that user.

```dockerfile
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```
**Line 57**: The command to start the application server.

---

## 3. Frontend Dockerfile (`frontend/Dockerfile`)

```dockerfile
ARG NODE_VERSION=20-alpine
```
**Line 2**: Defines Node version variable.

```dockerfile
FROM node:${NODE_VERSION} AS deps
...
RUN npm ci
```
**Lines 5-8**: **Stage 1 (Deps)**. Installs dependencies using `npm ci` (clean install, faster and more reliable than `npm install`).

```dockerfile
FROM node:${NODE_VERSION} AS tester
...
RUN npm run lint
```
**Lines 11-16**: **Stage 2 (Tester)**. Runs linting to check code quality.

```dockerfile
FROM node:${NODE_VERSION} AS builder
...
RUN npm run build
```
**Lines 19-23**: **Stage 3 (Builder)**. Builds the React app. This creates the `dist` folder with HTML/CSS/JS.

```dockerfile
FROM nginx:stable-alpine AS runner
```
**Line 26**: **Stage 4 (Runner)**. The final image uses Nginx, NOT Node.js. This is much smaller and faster for serving static files.

```dockerfile
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```
**Lines 33-34**: Copies *only* the built files (`dist`) from the Builder stage to Nginx's web folder. Also copies our Nginx config.

```dockerfile
CMD ["nginx", "-g", "daemon off;"]
```
**Line 38**: Starts Nginx.
