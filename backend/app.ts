import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import * as dotenv from 'dotenv';
import { db } from './db/config';
import { sql } from 'drizzle-orm';
import { documentRoutes, searchRoutes } from './routes';

dotenv.config();

export const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000'],
    credentials: true,
  })
);

app.get('/', (c) => {
  return c.json({
    name: 'Islamic Finance RAG API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      search: '/api/search',
      documents: '/api/documents',
    },
    documentation: 'Visit /health to check system status',
  });
});

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

// Register API routes
documentRoutes(app);
searchRoutes(app);
