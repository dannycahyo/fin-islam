import { eq, count, desc } from 'drizzle-orm';
import { db } from '@/db/config';
import { documents, type Document, type NewDocument } from '@/db/schema';

export class DocumentRepository {
  async create(data: NewDocument): Promise<Document> {
    const [document] = await db.insert(documents).values(data).returning();
    return document;
  }

  async findById(id: string): Promise<Document | null> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    return document || null;
  }

  async findByCategory(category: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.category, category));
  }

  async findAll(): Promise<Document[]> {
    return await db.select().from(documents);
  }

  async findPaginated(options: {
    category?: string;
    page: number;
    limit: number;
  }): Promise<{ documents: Document[]; total: number }> {
    const { category, page, limit } = options;
    const offset = (page - 1) * limit;

    const whereClause = category ? eq(documents.category, category) : undefined;

    const [documentsResult, countResult] = await Promise.all([
      db
        .select()
        .from(documents)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(documents.createdAt)),
      db.select({ count: count() }).from(documents).where(whereClause),
    ]);

    const total = countResult[0]?.count || 0;

    return { documents: documentsResult, total };
  }

  async update(id: string, data: Partial<NewDocument>): Promise<Document> {
    const [updated] = await db
      .update(documents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return updated;
  }

  async delete(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }
}
