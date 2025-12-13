import { ChatInterface } from "@/components/chat-interface";
import { Card } from "@/components/ui/card";

export default function ChatbotPage() {
    return (
        <div className="flex flex-col h-full">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
                <p className="text-muted-foreground">
                    Get instant answers and advice about your pet's feeding.
                </p>
            </div>
            <Card className="flex-1">
                <ChatInterface />
            </Card>
        </div>
    );
}
