import React, { useState, useRef, useEffect } from 'react';
import { useAIChat } from '@/hooks/useAIChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Bot,
    Send,
    X,
    Sparkles,
    RotateCcw,
    Maximize2,
    Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

export function AIChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [input, setInput] = useState('');
    const { messages, loading, sendMessage, clearChat } = useAIChat();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            sendMessage(input);
            setInput('');
        }
    };

    const quickActions = [
        "Analyze low stock",
        "Inventory summary",
        "Top value items",
        "Recent activity"
    ];

    return (
        <div className="fixed bottom-6 right-6 z-[100]">
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setIsOpen(true)}
                        className="h-14 w-14 rounded-full bg-primary shadow-lg shadow-primary/20 flex items-center justify-center text-primary-foreground hover:scale-110 transition-transform"
                    >
                        <Bot className="h-7 w-7" />
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            width: isMaximized ? '800px' : '400px',
                            height: isMaximized ? '700px' : '500px'
                        }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="glass border border-border/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-border/50 flex items-center justify-between bg-primary/5">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">AI Inventory Assistant</h3>
                                    <p className="text-[10px] text-muted-foreground">Powered by Gemini Pro</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMaximized(!isMaximized)}>
                                    {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearChat}>
                                    <RotateCcw className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-border"
                        >
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                                        <Bot className="h-10 w-10 text-primary" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">How can I help you today?</h4>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Ask me about your stock levels, recent movements, or for a business analysis.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 w-full">
                                        {quickActions.map(action => (
                                            <Button
                                                key={action}
                                                variant="outline"
                                                size="sm"
                                                className="text-[11px] h-auto py-2"
                                                onClick={() => sendMessage(action)}
                                            >
                                                {action}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, i) => (
                                <motion.div
                                    initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={i}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                            ? 'bg-primary text-primary-foreground rounded-tr-none'
                                            : 'bg-muted border border-border/50 rounded-tl-none prose prose-invert prose-sm'
                                        }`}>
                                        {msg.role === 'ai' ? (
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        ) : (
                                            msg.content
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-muted border border-border/50 p-3 rounded-2xl rounded-tl-none">
                                        <div className="flex gap-1">
                                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                                            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSend} className="p-4 border-t border-border/50 bg-background/50">
                            <div className="flex gap-2">
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask anything..."
                                    className="bg-background/50 border-border/50 focus-visible:ring-primary"
                                    disabled={loading}
                                />
                                <Button type="submit" size="icon" disabled={loading || !input.trim()}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
