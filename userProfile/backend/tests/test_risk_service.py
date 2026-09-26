import unittest
from datetime import datetime, timezone, timedelta
from app.database import SessionLocal
from app.models.user import User
from app.models.risk import RiskDetection
from app.routers.risk import get_risk_overview, get_risk_trends, list_risk_detections


class RiskServiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()
        cls.user = cls.db.query(User).filter_by(email="alex.morgan@example.com").first()
        if not cls.user:
            cls.user = cls.db.query(User).first()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_risk_overview_metrics(self):
        """Verify the 4 primary summary card metrics are derived from actual DB records."""
        overview = get_risk_overview(current_user=self.user, db=self.db)
        self.assertIsNotNone(overview.current_risk_status)
        self.assertIn(overview.risk_level_code, ["low", "medium", "high", "elevated"])
        self.assertGreaterEqual(overview.recent_violations, 0)
        self.assertGreaterEqual(overview.total_detections, 0)
        self.assertIn("%", overview.compliance_status)
        self.assertGreaterEqual(overview.compliance_rate_pct, 0.0)
        self.assertLessEqual(overview.compliance_rate_pct, 100.0)

    def test_risk_trends_series(self):
        """Verify daily risk trend data points return valid dates, risk scores, and counts."""
        trends = get_risk_trends(days=14, current_user=self.user, db=self.db)
        self.assertEqual(len(trends), 14)
        for point in trends:
            self.assertIsNotNone(point.date)
            self.assertIsNotNone(point.label)
            self.assertGreaterEqual(point.risk_score, 0.0)
            self.assertGreaterEqual(point.violations_count, 0)
            self.assertGreaterEqual(point.detections_count, 0)

    def test_risk_detections_filtering_and_fields(self):
        """Verify list_risk_detections returns populated records with rule and evidence."""
        detections = list_risk_detections(limit=10, current_user=self.user, db=self.db)
        self.assertGreater(len(detections), 0)
        for d in detections:
            self.assertIsNotNone(d.detected_object)
            self.assertIn(d.risk_level, ["High", "Medium", "Low"])
            self.assertGreater(d.confidence, 0.0)
            self.assertIsNotNone(d.rule_code)
            self.assertIsNotNone(d.rule_description)
            self.assertIsNotNone(d.evidence_summary)
            self.assertIsNotNone(d.status)


if __name__ == "__main__":
    unittest.main()
