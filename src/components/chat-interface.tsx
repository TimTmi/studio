'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { Bot, Send, User, Loader2 } from 'lucide-react';
import { getAiResponse } from '@/app/(app)/chatbot/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';
import { useDoc, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import Image from 'next/image';

type Message = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
};

type SuggestedQuestion = {
    key: string;
    text: string;
}

const suggestedQuestions: SuggestedQuestion[] = [
    { key: "EAT_TODAY", text: "How much did my pet eat today?" },
    { key: "LAST_FEEDING", text: "What was the last feeding time?" },
    { key: "SCHEDULE_TOMORROW", text: "Are there any feedings scheduled for tomorrow?" },
    { key: "SUMMARY_LAST_WEEK", text: "Summarize last week's feeding activity." },
];

export function ChatInterface() {
  const { user } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return doc(firestore, `users/${user.uid}`);
  }, [firestore, user?.uid]);
  const { data: userProfile } = useDoc(userProfileRef);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      text: "Hello! I'm your pet feeding assistant. Ask me anything about your pet's feeding schedule, history, or general advice.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const processQuery = (userQuery: string, questionKey?: string) => {
     if (!userQuery.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      text: userQuery,
    };

    const thinkingMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        text: 'Thinking...',
    };

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);

     startTransition(async () => {
       const feederId = userProfile?.feederId || null;
       
       const { response } = await getAiResponse(userQuery, feederId, questionKey);
       
       const assistantMessage: Message = {
         id: Date.now() + 1, // Same ID as thinking message to replace it
         role: 'assistant',
         text: response,
       };
       
       setMessages((prev) => 
        // Replace the thinking message with the actual response
        prev.map(m => m.id === thinkingMessage.id ? assistantMessage : m)
       );
    });
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;
    const query = input;
    setInput('');
    processQuery(query);
  };

  const handleSuggestedQuestion = (question: SuggestedQuestion) => {
    if (isPending) return;
    processQuery(question.text, question.key);
  };


  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollableView = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollableView) {
          scrollableView.scrollTo({
          top: scrollableView.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="space-y-6 p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex items-start gap-4',
                message.role === 'user' && 'justify-end'
              )}
            >
              {message.role === 'assistant' && (
                <Avatar className="h-9 w-9 border">
                  <AvatarFallback>
                    <Image src="/FoodCatCatFood.png" alt="AI avt" width={50} height={50}/>
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  'max-w-md rounded-lg p-3 text-sm',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                 {message.text === 'Thinking...' ? (
                    <div className="flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>Thinking...</span>
                    </div>
                ) : (
                    message.text
                )}
              </div>
              {message.role === 'user' && (
                <Avatar className="h-9 w-9 border">
                  <AvatarFallback>
                    <User />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="mb-2 flex flex-wrap gap-2">
            {suggestedQuestions.map((q) => (
                <Button key={q.key} variant="outline" size="sm" onClick={() => handleSuggestedQuestion(q)} disabled={isPending}>
                    {q.text}
                </Button>
            ))}
        </div>
        <Separator className="my-4"/>
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your pet's feeding..."
            disabled={isPending}
            className="flex-1"
          />
          <Button type="submit" disabled={isPending || !input.trim()}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
