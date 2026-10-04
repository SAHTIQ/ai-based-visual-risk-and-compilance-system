import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, SessionLocal
from app.models.user import User

class GoogleAuthTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()
        # Clean up any test users
        self.db.query(User).filter(User.email.in_([
            "gtest_new@example.com",
            "gtest_existing@example.com",
        ])).delete(synchronize_session=False)
        self.db.commit()

    def tearDown(self):
        self.db.query(User).filter(User.email.in_([
            "gtest_new@example.com",
            "gtest_existing@example.com",
        ])).delete(synchronize_session=False)
        self.db.commit()
        self.db.close()

    def test_empty_google_token_rejected(self):
        response = self.client.post("/api/auth/google", json={"id_token": ""})
        self.assertEqual(response.status_code, 400)

    def test_invalid_google_token_rejected(self):
        response = self.client.post("/api/auth/google", json={"id_token": "definitely.not.a.valid.jwt"})
        self.assertEqual(response.status_code, 401)

    @patch("app.routers.auth.verify_google_id_token")
    def test_new_user_registration_via_google(self, mock_verify):
        mock_verify.return_value = {
            "email": "gtest_new@example.com",
            "sub": "google-uid-12345",
            "name": "Google New User",
            "picture": "https://example.com/photo.jpg",
            "aud": "mock-client-id",
            "iss": "https://accounts.google.com"
        }

        response = self.client.post("/api/auth/google", json={"id_token": "valid.mock.token"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["email"], "gtest_new@example.com")
        self.assertEqual(data["name"], "Google New User")
        self.assertEqual(data["auth_provider"], "google")
        self.assertEqual(data["avatar_url"], "https://example.com/photo.jpg")
        self.assertIsNotNone(data["token"])

        # Check cookie was set
        cookies = response.cookies
        self.assertTrue(any("user_profiling_session" in c for c in cookies))

        # Check user in DB
        user = self.db.query(User).filter(User.email == "gtest_new@example.com").first()
        self.assertIsNotNone(user)
        self.assertEqual(user.google_id, "google-uid-12345")
        self.assertIsNone(user.password_hash)

    @patch("app.routers.auth.verify_google_id_token")
    def test_existing_user_linked_via_google(self, mock_verify):
        # First create an existing user
        existing = User(
            name="Existing Local User",
            email="gtest_existing@example.com",
            password_hash="some_hash",
            role="user",
            auth_provider="local"
        )
        self.db.add(existing)
        self.db.commit()
        self.db.refresh(existing)

        mock_verify.return_value = {
            "email": "gtest_existing@example.com",
            "sub": "google-uid-67890",
            "name": "Google User Name",
            "picture": "https://example.com/new_photo.jpg",
            "aud": "mock-client-id",
            "iss": "https://accounts.google.com"
        }

        response = self.client.post("/api/auth/google", json={"id_token": "valid.mock.token"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], existing.id)
        self.assertEqual(data["email"], "gtest_existing@example.com")

        # Verify google_id linked in DB
        self.db.refresh(existing)
        self.assertEqual(existing.google_id, "google-uid-67890")
        self.assertEqual(existing.auth_provider, "google")

if __name__ == "__main__":
    unittest.main()
