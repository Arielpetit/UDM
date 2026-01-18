# Global ARGs
ARG PYTHON_VERSION=3.11-slim

# Stage 1: Builder
FROM python:${PYTHON_VERSION} as builder

WORKDIR /app

# Prevent Python from writing pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Tester
FROM python:${PYTHON_VERSION} as tester

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY . .

# Run linting
RUN flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics

# Run tests
RUN pytest

# Stage 3: Runner
FROM python:${PYTHON_VERSION} as runner

LABEL maintainer="arielpeit"
LABEL version="1.0"
LABEL description="Inventory Backend API"

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY . .

# Change ownership to non-root user
RUN chown -R appuser:appuser /app

USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
