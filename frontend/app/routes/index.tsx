import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="container py-6">
      <div className="mx-auto max-w-4xl">
        <Card className="h-[calc(100vh-12rem)]">
          <CardContent className="flex h-full flex-col p-0">
            {/* Chat messages area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Welcome message */}
                <div className="flex justify-center">
                  <div className="rounded-lg bg-muted px-4 py-3 text-center text-sm text-muted-foreground">
                    <p className="font-medium">Welcome to Islamic Finance Assistant</p>
                    <p className="mt-1">
                      Ask me anything about Islamic finance principles and products
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Input area */}
            <div className="border-t p-4">
              <form className="flex gap-2">
                <Textarea
                  placeholder="Ask about Islamic finance..."
                  className="min-h-[60px] resize-none"
                />
                <Button type="submit" size="icon" className="h-[60px] w-[60px]">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
