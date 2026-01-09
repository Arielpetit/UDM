# Stage 1: Builder
# We use a python image to install dependencies
FROM python:3.11-slim as builder

WORKDIR /app

# Create a virtual environment to isolate dependencies
RUN python -m venv /opt/venv
# Make sure we use the venv:
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Final
# We use a fresh python image to run the application
FROM python:3.11-slim

WORKDIR /app

# Copy only the virtual environment from the previous stage
COPY --from=builder /opt/venv /opt/venv
# Enable venv
ENV PATH="/opt/venv/bin:$PATH"

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
