import unittest
from datetime import datetime, timezone
from app.database import SessionLocal
from app.models.user import User
from app.models.chat import Conversation, ChatMessage
from app.services.llm import get_llm_service
from app.services.app_context import get_user_risk_context, build_system_prompt
from app.services.rag import rag_service


class ChatAndLLMTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()
        cls.user1 = cls.db.query(User).filter_by(email="alex.morgan@example.com").first()
        if not cls.user1:
            cls.user1 = cls.db.query(User).first()
        cls.user2 = cls.db.query(User).filter(User.id != cls.user1.id).first()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_conversation_persistence_and_isolation(self):
        """Verify conversations are saved with messages and isolated per user."""
        db = self.db
        user1 = self.user1
        user2 = self.user2

        # Create conversation for user 1
        conv1 = Conversation(user_id=user1.id, title="Unit Test Conversation")
        db.add(conv1)
        db.commit()
        db.refresh(conv1)

        msg1 = ChatMessage(
            conversation_id=conv1.id,
            sender="user",
            content="What is my risk status?",
        )
        msg2 = ChatMessage(
            conversation_id=conv1.id,
            sender="assistant",
            content="Your risk status is currently Low.",
        )
        db.add_all([msg1, msg2])
        db.commit()

        # Query back for user 1
        user1_convs = db.query(Conversation).filter_by(user_id=user1.id).all()
        self.assertTrue(any(c.id == conv1.id for c in user1_convs))
        self.assertEqual(len(conv1.messages), 2)
        self.assertEqual(conv1.messages[0].sender, "user")
        self.assertEqual(conv1.messages[1].sender, "assistant")

        # Verify user 2 cannot see user 1's conversation
        if user2:
            user2_conv = db.query(Conversation).filter_by(id=conv1.id, user_id=user2.id).first()
            self.assertIsNone(user2_conv, "Data leak: User 2 accessed User 1 conversation!")

        # Clean up
        db.delete(conv1)
        db.commit()

    def test_llm_service_unconfigured_handling(self):
        """Verify LLM service gracefully reports setup notice when key is unconfigured without crashing."""
        llm = get_llm_service()
        resp = llm.generate(
            messages=[{"role": "user", "content": "Hello"}],
            system_prompt="Test system prompt",
        )
        self.assertIsNotNone(resp)
        self.assertIn("content", resp.to_dict())
        if not llm.is_available():
            self.assertFalse(resp.is_configured)
            self.assertIn("API key", resp.content)

    def test_app_context_extraction(self):
        """Verify user risk context extracts real records and enforces no fabrication."""
        ctx = get_user_risk_context(self.db, self.user1)
        self.assertIn("user_profile", ctx)
        self.assertIn("risk_intelligence", ctx)
        self.assertIn("ml_predictions", ctx)
        self.assertIn("future_simulation", ctx)

        risk_intel = ctx["risk_intelligence"]
        self.assertIn("current_risk_status", risk_intel)
        self.assertIn("total_detections", risk_intel)
        self.assertIn("compliance_status", risk_intel)
        self.assertIn("compliance_rate_pct", risk_intel)

        # Build prompt
        prompt = build_system_prompt(ctx)
        self.assertIn("STRICT OPERATIONAL RULES", prompt)
        self.assertIn("Insufficient Evidence", prompt)
        self.assertIn(self.user1.name, prompt)

    def test_rag_and_web_readiness_reporting(self):
        """Verify RAG and web research readiness are honestly reported as pending with zero fake citations."""
        meta = rag_service.get_readiness_meta()
        self.assertIn("rag_retrieval", meta)
        self.assertIn("web_research", meta)
        self.assertFalse(meta["rag_retrieval"]["is_operational"])
        self.assertFalse(meta["web_research"]["is_operational"])
        self.assertEqual(len(rag_service.retrieve_relevant_documents("safety")), 0)
        self.assertIsNone(rag_service.perform_web_search("regulations"))


if __name__ == "__main__":
    unittest.main()
