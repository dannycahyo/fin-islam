import { Chat } from '@/components/chat';

export default function ChatPage() {
  return (
    <div className="container px-4 py-4 sm:px-6 sm:py-6 md:py-8">
      <div className="mx-auto max-w-4xl">
        <Chat />
      </div>
    </div>
  );
}
