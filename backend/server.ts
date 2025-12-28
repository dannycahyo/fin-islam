import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import * as dotenv from 'dotenv';
import { db } from './db/config';
import { sql } from 'drizzle-orm';

dotenv.config();

const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000'],
    credentials: true,
  })
);

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Islamic Finance RAG API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      chat: '/api/chat',
      documents: '/api/documents',
    },
    documentation: 'Visit /health to check system status',
  });
});

// Health check
app.get('/health', async (c) => {
  try {
    // Check database connection
    await db.execute(sql`SELECT 1`);

    return c.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        status: 'error',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      503
    );
  }
});

// API routes will be added here
app.get('/api/chat', (c) => {
  return c.json({ message: 'Chat endpoint ready' });
});

app.get('/api/documents', (c) => {
  return c.json({ documents: [] });
});

const port = parseInt(process.env.PORT || '3001');

console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
