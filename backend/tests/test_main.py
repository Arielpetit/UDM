from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    # Assuming the root endpoint returns a welcome message or similar
    # Adjust assertion based on actual response if needed
