def test_register_user(client):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "test_donor@testbank.com",
            "password": "testpassword123",
            "full_name": "Test Donor",
            "role": "donor",
            "phone": "+1234567890",
            "address": "123 Test St",
            "blood_group": "A+"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test_donor@testbank.com"
    assert data["full_name"] == "Test Donor"
    assert data["role"] == "donor"
    assert data["blood_group"] == "A+"

def test_login_user(client):
    response = client.post(
        "/api/auth/login",
        data={
            "username": "test_donor@testbank.com",
            "password": "testpassword123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["role"] == "donor"

def test_login_invalid(client):
    response = client.post(
        "/api/auth/login",
        data={
            "username": "test_donor@testbank.com",
            "password": "wrongpassword"
        }
    )
    assert response.status_code == 401
