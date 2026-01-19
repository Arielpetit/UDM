import { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ChatMessage {
    role: 'user' | 'ai';
    content: string;
}

export function useAIChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);

    const sendMessage = async (message: string) => {
        if (!message.trim()) return;

        const newUserMessage: ChatMessage = { role: 'user', content: message };
        setMessages(prev => [...prev, newUserMessage]);
        setLoading(true);

        try {
            const response = await axios.post(`${API_URL}/ai/chat`, { message });
            const aiMessage: ChatMessage = { role: 'ai', content: response.data.response };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('AI Chat Error:', error);
            const errorMessage: ChatMessage = {
                role: 'ai',
                content: 'Sorry, I encountered an error while processing your request. Please make sure the backend is running and GEMINI_API_KEY is set.'
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const clearChat = () => setMessages([]);

    return {
        messages,
        loading,
        sendMessage,
        clearChat
    };
}
