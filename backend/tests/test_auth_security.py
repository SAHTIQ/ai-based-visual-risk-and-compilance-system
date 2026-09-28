import unittest
from fastapi import HTTPException
from app.database import SessionLocal
from app.models.user import User
from app.auth import hash_password, check_auth_rate_limit, _auth_rate_limits
from app.routers.users import get_user, update_user
from app.schemas.user import UserUpdate, UserOut

class AuthSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()
        cls.admin_user = cls.db.query(User).filter_by(role="admin").first()
        cls.normal_users = cls.db.query(User).filter_by(role="user").all()
        if len(cls.normal_users) < 2:
            cls.user_a = cls.db.query(User).filter(User.id == 12).first()
            cls.user_b = cls.db.query(User).filter(User.id == 13).first()
        else:
            cls.user_a = cls.normal_users[0]
            cls.user_b = cls.normal_users[1]

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_idor_user_cannot_access_other_user(self):
        """User A must NOT be allowed to view User B's profile via get_user."""
        with self.assertRaises(HTTPException) as ctx:
            get_user(user_id=self.user_b.id, current_user=self.user_a, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("denied", ctx.exception.detail.lower())

    def test_idor_user_cannot_modify_other_user(self):
        """User A must NOT be allowed to modify User B's account via update_user."""
        updates = UserUpdate(name="Hacked Name")
        with self.assertRaises(HTTPException) as ctx:
            update_user(user_id=self.user_b.id, user_in=updates, current_user=self.user_a, db=self.db)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_user_can_access_own_profile(self):
        """User A can access their own profile."""
        profile = get_user(user_id=self.user_a.id, current_user=self.user_a, db=self.db)
        self.assertEqual(profile.id, self.user_a.id)
        self.assertEqual(profile.email, self.user_a.email)

    def test_admin_can_access_any_profile(self):
        """Admin user can access other users' profiles."""
        if self.admin_user:
            profile = get_user(user_id=self.user_a.id, current_user=self.admin_user, db=self.db)
            self.assertEqual(profile.id, self.user_a.id)

    def test_no_password_hash_in_user_out_schema(self):
        """UserOut schema must NOT contain password or password_hash attributes."""
        out = UserOut.model_validate(self.user_a)
        self.assertFalse(hasattr(out, "password_hash"))
        self.assertFalse(hasattr(out, "password"))
        out_dict = out.model_dump()
        self.assertNotIn("password_hash", out_dict)
        self.assertNotIn("password", out_dict)

    def test_auth_rate_limiting(self):
        """Exceeding max attempts in window triggers 429 Too Many Requests."""
        key = "ip:198.51.100.99"
        _auth_rate_limits.pop(key, None)

        # 5 attempts with max_attempts=5 should pass
        for _ in range(5):
            check_auth_rate_limit(key, max_attempts=5, window_seconds=60)

        # 6th attempt should raise 429
        with self.assertRaises(HTTPException) as ctx:
            check_auth_rate_limit(key, max_attempts=5, window_seconds=60)
        self.assertEqual(ctx.exception.status_code, 429)
        self.assertIn("too many", ctx.exception.detail.lower())

if __name__ == "__main__":
    unittest.main()
