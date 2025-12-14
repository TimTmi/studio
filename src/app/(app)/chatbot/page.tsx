import { ChatInterface } from "@/components/chat-interface";
import { Card } from "@/components/ui/card";

export default function ChatbotPage() {
    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
                <p className="text-muted-foreground">
                    Talk to our AI assistant to get answers for you and your pet!
                </p>
            </div>
            <Card className="flex-1 overflow-hidden">
                <ChatInterface />
            </Card>
        </div>
    );
}
