import { pgTable, text, timestamp, uuid, vector, integer } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const documents = pgTable('documents', {
  id: uuid('id')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category').notNull(), // principles, products, comparison, general
  filePath: text('file_path').notNull(),
  fileType: text('file_type').notNull(), // pdf, docx, txt, md
  status: text('status').default('processing').notNull(), // processing, indexed, failed
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const documentChunks = pgTable('document_chunks', {
  id: uuid('id')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  documentId: uuid('document_id')
    .references(() => documents.id, { onDelete: 'cascade' })
    .notNull(),
  content: text('content').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  embedding: vector('embedding', { dimensions: 768 }), // nomic-embed-text dimensions
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;
