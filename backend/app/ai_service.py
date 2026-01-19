import os
import google.generativeai as genai
from typing import List, Dict
import json

class AIService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-pro')
        else:
            self.model = None

    async def get_chat_response(self, message: str, context_data: Dict) -> str:
        if not self.model:
            return "AI Assistant is not configured. Please provide a GEMINI_API_KEY."

        prompt = f"""
        You are an intelligent Inventory Management Assistant for the "UDM Inventory Tracker" system.
        Your goal is to help the user manage their inventory, analyze stock levels, and provide business insights.

        CURRENT SYSTEM DATA (JSON):
        {json.dumps(context_data, indent=2)}

        USER QUESTION:
        {message}

        INSTRUCTIONS:
        1. Use the provided JSON data to answer accurately.
        2. If the user asks for analysis, look for trends or issues (like low stock).
        3. Be concise, professional, and helpful.
        4. If you don't have enough data to answer a specific question, say so.
        5. Format your response using Markdown.
        """

        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error generating AI response: {str(e)}"

ai_service = AIService()
