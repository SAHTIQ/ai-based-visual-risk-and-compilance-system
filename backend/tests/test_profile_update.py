import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.profile import UserProfile
from app.auth import create_session_token
from app.config import settings

class ProfileUpdateTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()
        # Create a test user
        self.user = self.db.query(User).filter(User.email == "testprofile@example.com").first()
        if not self.user:
            self.user = User(
                name="Initial Profile Name",
                email="testprofile@example.com",
                role="user"
            )
            self.db.add(self.user)
            self.db.commit()
            self.db.refresh(self.user)
            self.profile = UserProfile(
                user_id=self.user.id,
                occupation="Student",
                age=21
            )
            self.db.add(self.profile)
            self.db.commit()
        self.token = create_session_token(self.user.id)
        self.cookies = {settings.SESSION_COOKIE_NAME: self.token}

    def tearDown(self):
        self.db.query(UserProfile).filter(UserProfile.user_id == self.user.id).delete()
        self.db.query(User).filter(User.id == self.user.id).delete()
        self.db.commit()
        self.db.close()

    def test_get_profile_returns_name_and_email(self):
        response = self.client.get("/api/profile", cookies=self.cookies)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["name"], "Initial Profile Name")
        self.assertEqual(data["email"], "testprofile@example.com")
        self.assertEqual(data["occupation"], "Student")

    def test_update_profile_updates_name_and_attributes(self):
        update_payload = {
            "name": "Updated Real Name",
            "occupation": "Senior Developer",
            "age": 25,
            "location": "Chennai",
            "phone": "9876543210"
        }
        response = self.client.put("/api/profile", json=update_payload, cookies=self.cookies)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["name"], "Updated Real Name")
        self.assertEqual(data["email"], "testprofile@example.com")
        self.assertEqual(data["occupation"], "Senior Developer")
        self.assertEqual(data["age"], 25)
        self.assertEqual(data["location"], "Chennai")

        # Verify DB directly
        self.db.refresh(self.user)
        self.assertEqual(self.user.name, "Updated Real Name")

if __name__ == "__main__":
    unittest.main()
