import unittest
from datetime import date
from app.database import SessionLocal
from app.models.user import User
from app.schemas.simulation import WhatIfParameters
from app.services.simulation import (
    compute_user_baseline,
    run_simulation,
    compute_sensitivity_analysis,
    evaluate_rules,
    get_user_simulation_history,
    delete_user_simulation_history,
)


class SimulationEngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()
        cls.user1 = cls.db.query(User).filter_by(email="u001@example.com").first()
        cls.user2 = cls.db.query(User).filter_by(email="u002@example.com").first()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_feature1_baseline_derivation(self):
        """Feature 1: Verify actual user records populate baseline metrics with valid metadata."""
        baseline = compute_user_baseline(self.db, self.user1.id)
        self.assertGreater(baseline.records_used, 0)
        self.assertIsNotNone(baseline.baseline_date)
        self.assertIsNotNone(baseline.data_range_start)
        self.assertIsNotNone(baseline.data_range_end)
        self.assertEqual(baseline.data_status, "valid")
        self.assertGreaterEqual(baseline.savings, 0.0)
        self.assertGreater(baseline.monthly_spending, 0.0)
        self.assertGreater(baseline.sleep_hrs_night, 0.0)
        self.assertGreaterEqual(baseline.burnout_pct, 0.0)
        self.assertLessEqual(baseline.burnout_pct, 100.0)

    def test_feature2_and_4_what_if_and_horizons(self):
        """Feature 2 & 4: Custom What-If simulator across 30D, 90D, 6M (180D), and 1Y (365D)."""
        baseline = compute_user_baseline(self.db, self.user1.id)
        for horizon in [30, 90, 180, 365]:
            params = WhatIfParameters(
                study_load_hrs_week=40.0,
                sleep_hrs_night=6.5,
                monthly_spending=baseline.monthly_spending + 1500.0,
                exercise_days_week=2.0,
                horizon_days=horizon,
            )
            sim = run_simulation(self.db, self.user1.id, params=params, save_to_history=False)
            self.assertEqual(sim.simulation_period, horizon)
            self.assertEqual(sim.evidence_status, "valid")
            self.assertIn("best", sim.scenarios)
            self.assertIn("expected", sim.scenarios)
            self.assertIn("risk", sim.scenarios)
            self.assertGreater(len(sim.scenarios["expected"].daily_values), 0)

    def test_feature3_before_vs_after_impact(self):
        """Feature 3: Verify impact comparison between baseline and simulated values."""
        baseline = compute_user_baseline(self.db, self.user1.id)
        params = WhatIfParameters(
            monthly_spending=baseline.monthly_spending + 2000.0,
            sleep_hrs_night=6.0,
            horizon_days=90,
        )
        sim = run_simulation(self.db, self.user1.id, params=params, save_to_history=False)
        self.assertIsNotNone(sim.impact)
        self.assertGreater(len(sim.impact), 0)
        
        spending_impact = next((i for i in sim.impact if i.metric == "monthly_spending"), None)
        self.assertIsNotNone(spending_impact)
        self.assertEqual(spending_impact.simulated, baseline.monthly_spending + 2000.0)
        self.assertAlmostEqual(spending_impact.change, 2000.0, delta=0.1)
        self.assertFalse(spending_impact.direction_is_favorable)

    def test_feature5_sensitivity_analysis(self):
        """Feature 5: One-At-A-Time sensitivity ranking without arbitrary inventions."""
        baseline = compute_user_baseline(self.db, self.user1.id)
        sensitivity = compute_sensitivity_analysis(baseline, 90)
        self.assertEqual(len(sensitivity), 4)
        labels = [s.label for s in sensitivity]
        self.assertIn("Monthly Spending", labels)
        self.assertIn("Sleep", labels)
        self.assertIn("Study Load", labels)
        self.assertIn("Exercise", labels)
        for s in sensitivity:
            self.assertIn(s.impact_level, ["High", "Medium-High", "Medium", "Low"])
            self.assertGreaterEqual(s.impact_score, 0.0)
            self.assertLessEqual(s.impact_score, 100.0)

    def test_feature6_evidence_and_confidence(self):
        """Feature 6: Evidence metadata, feature presence, and confidence score."""
        baseline = compute_user_baseline(self.db, self.user1.id)
        sim = run_simulation(self.db, self.user1.id, save_to_history=False)
        self.assertIsNotNone(sim.evidence_meta)
        self.assertEqual(sim.evidence_meta.records_used, baseline.records_used)
        self.assertGreater(sim.evidence_meta.confidence_pct, 0)
        self.assertTrue(sim.evidence_meta.is_sufficient)

    def test_feature7_and_explainability_rule_trace(self):
        """Feature 7 & Rule Trace: Grounded AI explanation, rule evaluation, and condition trace."""
        baseline = compute_user_baseline(self.db, self.user1.id)
        params = WhatIfParameters(
            monthly_spending=baseline.monthly_spending + 2500.0,
            study_load_hrs_week=45.0,
            sleep_hrs_night=5.8,
            horizon_days=30,
        )
        sim = run_simulation(self.db, self.user1.id, params=params, save_to_history=False)
        self.assertIsNotNone(sim.ai_explanation)
        self.assertIsNotNone(sim.recommendation)
        self.assertIsNotNone(sim.rule_trace)
        self.assertIsNotNone(sim.why_recommendation)
        
        triggered = [r for r in sim.rule_trace if r.is_satisfied]
        self.assertGreater(len(triggered), 0)
        self.assertIn(sim.why_recommendation.primary_contributing_factor, ["Study Load", "Monthly Spending", "Sleep", "Exercise"])

    def test_simulation_history_and_multi_user_isolation(self):
        """Multi-user isolation: User 1 history must not be visible to User 2."""
        params = WhatIfParameters(study_load_hrs_week=28.0, horizon_days=30)
        sim_u1 = run_simulation(self.db, self.user1.id, params=params, save_to_history=True)
        self.assertIsNotNone(sim_u1.history_id)

        history_u1 = get_user_simulation_history(self.db, self.user1.id)
        history_u2 = get_user_simulation_history(self.db, self.user2.id)

        self.assertTrue(any(h.id == sim_u1.history_id for h in history_u1))
        self.assertFalse(any(h.id == sim_u1.history_id for h in history_u2))

        delete_success = delete_user_simulation_history(self.db, self.user1.id, sim_u1.history_id)
        self.assertTrue(delete_success)


if __name__ == "__main__":
    unittest.main()
