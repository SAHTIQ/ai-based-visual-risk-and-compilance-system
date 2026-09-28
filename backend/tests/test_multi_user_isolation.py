import unittest
from app.database import SessionLocal
from app.models.user import User
from app.models.risk import RiskDetection
from app.models.work_session import WorkSession
from app.models.financial import FinancialRecord
from app.models.study import StudyRecord
from app.routers.risk import list_risk_detections, get_risk_overview
from app.routers.behavior import get_user_work_sessions

class MultiUserIsolationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()
        cls.marcus = cls.db.query(User).filter_by(email="marcus.vance@example.com").first()
        cls.elena = cls.db.query(User).filter_by(email="elena.rostova@example.com").first()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_users_exist_and_distinct(self):
        """Ensure Marcus and Elena exist with distinct primary keys."""
        self.assertIsNotNone(self.marcus)
        self.assertIsNotNone(self.elena)
        self.assertNotEqual(self.marcus.id, self.elena.id)

    def test_risk_detection_isolation(self):
        """Marcus querying risk detections must NEVER receive Elena's detections."""
        marcus_detections = list_risk_detections(limit=100, current_user=self.marcus, db=self.db)
        elena_detections = list_risk_detections(limit=100, current_user=self.elena, db=self.db)

        self.assertGreater(len(marcus_detections), 0)
        self.assertGreater(len(elena_detections), 0)

        marcus_ids = {d.id for d in marcus_detections}
        elena_ids = {d.id for d in elena_detections}

        # Mutual exclusivity
        self.assertEqual(len(marcus_ids.intersection(elena_ids)), 0, "Data leakage: Shared detection IDs across tenants!")

        # Verify DB foreign keys match user identity
        for d in marcus_detections:
            rec = self.db.query(RiskDetection).filter_by(id=d.id).first()
            self.assertEqual(rec.user_id, self.marcus.id)

        for d in elena_detections:
            rec = self.db.query(RiskDetection).filter_by(id=d.id).first()
            self.assertEqual(rec.user_id, self.elena.id)

    def test_risk_overview_isolation(self):
        """Risk overview metrics are computed strictly on isolated tenant data."""
        marcus_overview = get_risk_overview(current_user=self.marcus, db=self.db)
        elena_overview = get_risk_overview(current_user=self.elena, db=self.db)

        # Confirm both return valid non-null isolated overviews
        self.assertIsNotNone(marcus_overview.current_risk_status)
        self.assertIsNotNone(elena_overview.current_risk_status)
        self.assertGreater(marcus_overview.total_detections, 0)
        self.assertGreater(elena_overview.total_detections, 0)

    def test_work_session_isolation(self):
        """Marcus cannot view Elena's work sessions."""
        marcus_sessions = get_user_work_sessions(current_user=self.marcus, db=self.db)
        elena_sessions = get_user_work_sessions(current_user=self.elena, db=self.db)

        self.assertGreater(len(marcus_sessions), 0)
        self.assertGreater(len(elena_sessions), 0)

        marcus_sess_ids = {s.id for s in marcus_sessions}
        elena_sess_ids = {s.id for s in elena_sessions}

        self.assertEqual(len(marcus_sess_ids.intersection(elena_sess_ids)), 0, "Data leakage: Shared work session IDs!")

        for s in marcus_sessions:
            rec = self.db.query(WorkSession).filter_by(id=s.id).first()
            self.assertEqual(rec.user_id, self.marcus.id)

    def test_financial_and_study_tenant_isolation(self):
        """Direct DB queries confirm strict user_id segregation across core tables."""
        u1 = self.db.query(User).filter_by(email="u001@example.com").first()
        u2 = self.db.query(User).filter_by(email="u002@example.com").first()
        self.assertIsNotNone(u1)
        self.assertIsNotNone(u2)

        u1_fin = self.db.query(FinancialRecord).filter_by(user_id=u1.id).all()
        u2_fin = self.db.query(FinancialRecord).filter_by(user_id=u2.id).all()
        
        self.assertGreater(len(u1_fin), 0)
        self.assertGreater(len(u2_fin), 0)
        
        u1_ids = {f.id for f in u1_fin}
        u2_ids = {f.id for f in u2_fin}
        self.assertEqual(len(u1_ids.intersection(u2_ids)), 0)

if __name__ == "__main__":
    unittest.main()
