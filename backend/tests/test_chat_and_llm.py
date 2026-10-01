import unittest
from datetime import datetime, timezone
from app.database import SessionLocal
from app.models.user import User
from app.models.chat import Conversation, ChatMessage
from app.services.llm import get_llm_service, UnifiedLLMService
from app.services.app_context import (
    get_user_risk_context,
    get_user_productivity_context,
    detect_query_intents,
    build_system_prompt,
)
from app.services.rag import rag_service
from app.routers.chat import get_chat_suggestions


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
        conv1 = Conversation(user_id=user1.id, title="Productivity Analysis Session")
        db.add(conv1)
        db.commit()
        db.refresh(conv1)

        msg1 = ChatMessage(
            conversation_id=conv1.id,
            sender="user",
            content="Summarize my recent productivity and activity patterns.",
        )
        msg2 = ChatMessage(
            conversation_id=conv1.id,
            sender="assistant",
            content="Your productivity score is currently 71 with strong coding focus.",
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

    def test_llm_service_generation_and_error_shielding(self):
        """Verify LLM service generates output or gracefully shields raw errors without crashing."""
        llm = get_llm_service()
        resp = llm.generate(
            messages=[{"role": "user", "content": "Hello"}],
            system_prompt="Test system prompt",
        )
        self.assertIsNotNone(resp)
        self.assertIn("content", resp.to_dict())
        if not llm.is_available():
            self.assertFalse(resp.is_configured)
            self.assertIn("temporarily unavailable", resp.content)

    def test_productivity_context_extraction(self):
        """Verify user productivity context extracts real records and enforces no fabrication."""
        ctx = get_user_productivity_context(self.db, self.user1, query="Summarize my productivity")
        self.assertIn("user_profile", ctx)
        self.assertIn("productivity_analytics", ctx)
        self.assertIn("query_domains", ctx)

        # Build prompt
        prompt = build_system_prompt(ctx)
        self.assertIn("STRICT OPERATIONAL RULES", prompt)
        self.assertIn("Insufficient Evidence", prompt)
        self.assertIn(self.user1.name, prompt)
        
        # Verify instructions portion does not prescribe safety or risk compliance
        instructions = prompt.split("STRICT OPERATIONAL RULES")[1].lower()
        self.assertNotIn("hazard", instructions)
        self.assertNotIn("ppe compliance", instructions)
        self.assertNotIn("risk detection", instructions)

    def test_intent_detection(self):
        """Verify intent detection accurately extracts targeted domains."""
        self.assertIn("habits", detect_query_intents("What habits are affecting my productivity the most?"))
        self.assertIn("productivity", detect_query_intents("Why was my productivity lower this week?"))
        self.assertIn("study", detect_query_intents("What are the main patterns in my study and work sessions?"))
        self.assertIn("financial", detect_query_intents("How does my monthly spending compare with my savings goal?"))
        self.assertIn("forecast", detect_query_intents("Explain my latest forecast and the factors influencing it."))
        self.assertIn("simulation", detect_query_intents("What does my latest simulation indicate about my future routine?"))

    def test_model_routing_complexity_classifier(self):
        """Verify simple queries route to fast model and complex queries route to strong model."""
        llm = UnifiedLLMService()
        # Simple queries
        self.assertFalse(llm.classify_query_complexity("What is my productivity score?"))
        self.assertFalse(llm.classify_query_complexity("How many hours did I study?"))
        self.assertFalse(llm.classify_query_complexity("Explain my habit trend"))
        self.assertFalse(llm.classify_query_complexity("Summarize my week"))

        # Complex queries
        self.assertTrue(llm.classify_query_complexity("Compare my productivity from previous weeks with my spending correlation and future simulation trajectory."))
        self.assertTrue(llm.classify_query_complexity("Deep dive into the tradeoff between study hours and burnout risk in my simulation."))

    def test_dynamic_suggestions_endpoint(self):
        """Verify suggested questions are dynamic, relevant, and free of risk/compliance terms."""
        suggestions_out = get_chat_suggestions(current_user=self.user1, db=self.db)
        self.assertTrue(len(suggestions_out.categories) > 0)
        self.assertTrue(len(suggestions_out.suggestions) >= 2)
        self.assertTrue(len(suggestions_out.suggestions) <= 8)

        # Verify no risk/compliance terminology in suggested questions
        for item in suggestions_out.suggestions:
            q_lower = item.question.lower()
            self.assertNotIn("risk", q_lower)
            self.assertNotIn("compliance", q_lower)
            self.assertNotIn("hazard", q_lower)
            self.assertNotIn("ppe", q_lower)
            self.assertNotIn("safety violation", q_lower)

    def test_rag_and_web_readiness_reporting(self):
        """Verify RAG and web research readiness are honestly reported as pending with zero fake citations."""
        meta = rag_service.get_readiness_meta()
        self.assertIn("rag_retrieval", meta)
        self.assertIn("web_research", meta)
        self.assertFalse(meta["rag_retrieval"]["is_operational"])
        self.assertFalse(meta["web_research"]["is_operational"])
    def test_greeting_intent_and_card_suppression(self):
        """Verify that simple greetings are recognized as greetings, suppress cards, and title as Welcome Chat."""
        from app.services.app_context import extract_inline_cards_and_sources, generate_conversation_title

        # 1. Intent detection
        intents_hi = detect_query_intents("Hi")
        self.assertIn("greeting", intents_hi)
        self.assertNotIn("productivity", intents_hi)

        intents_hello = detect_query_intents("Hello, how are you?")
        self.assertIn("greeting", intents_hello)

        # 2. Context retrieval for greeting
        ctx = get_user_productivity_context(self.db, self.user1, query="Hi")
        self.assertTrue(ctx.get("is_greeting"))
        self.assertNotIn("productivity_analytics", ctx)

        # 3. Inline cards and sources suppression
        meta = extract_inline_cards_and_sources(ctx, query="Hi")
        self.assertEqual(meta["sources_used"], [])
        self.assertEqual(meta["inline_cards"], {})

        # 4. Smart title generation for greeting
        title = generate_conversation_title("Hi")
        self.assertEqual(title, "Welcome Chat")

        # 5. Friendly system prompt for greeting
        prompt = build_system_prompt(ctx)
        self.assertIn("Greet", prompt)
        self.assertIn("warmly", prompt)
        self.assertNotIn("Short answer:", prompt)


if __name__ == "__main__":
    unittest.main()

