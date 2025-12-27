import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';

// Routes will be created later
const App = () => {
  return (
    <div className="min-h-screen bg-background">
      <h1 className="text-3xl font-bold text-center py-8">Islamic Finance Knowledge Assistant</h1>
      <p className="text-center text-muted-foreground">Setup complete. Ready to build!</p>
    </div>
  );
};

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
