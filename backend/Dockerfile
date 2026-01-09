# Stage 1: Builder
FROM python:3.11-slim as builder

WORKDIR /app

RUN python -m venv /opt/venv
# Make sure we use the venv:
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Final
FROM python:3.11-slim

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
# Enable venv
ENV PATH="/opt/venv/bin:$PATH"

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
