import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, olympiadSessions, roundScores, InsertOlympiadSession, InsertRoundScore } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Olympiad session queries
export async function createOlympiadSession(sessionToken: string): Promise<InsertOlympiadSession | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create session: database not available");
    return null;
  }

  try {
    const result = await db.insert(olympiadSessions).values({
      sessionToken,
      currentRound: 1,
      currentPhase: "selection",
      totalScore: 0,
    });
    return { sessionToken, currentRound: 1, currentPhase: "selection", totalScore: 0 };
  } catch (error) {
    console.error("[Database] Failed to create session:", error);
    return null;
  }
}

export async function getSessionByToken(sessionToken: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(olympiadSessions).where(eq(olympiadSessions.sessionToken, sessionToken)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateSessionPhase(sessionId: number, phase: "selection" | "question" | "completed", difficulty?: "mudah" | "sedang" | "sulit") {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const updateData: any = { currentPhase: phase };
    if (difficulty) updateData.selectedDifficulty = difficulty;
    
    await db.update(olympiadSessions).set(updateData).where(eq(olympiadSessions.id, sessionId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update session phase:", error);
    return null;
  }
}

export async function advanceRound(sessionId: number) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const session = await db.select().from(olympiadSessions).where(eq(olympiadSessions.id, sessionId)).limit(1);
    if (!session.length) return null;
    
    const nextRound = session[0].currentRound + 1;
    if (nextRound > 6) {
      await db.update(olympiadSessions).set({ currentPhase: "completed" }).where(eq(olympiadSessions.id, sessionId));
      return { completed: true };
    }
    
    await db.update(olympiadSessions).set({ currentRound: nextRound, currentPhase: "selection", selectedDifficulty: null }).where(eq(olympiadSessions.id, sessionId));
    return { completed: false, round: nextRound };
  } catch (error) {
    console.error("[Database] Failed to advance round:", error);
    return null;
  }
}

export async function saveRoundScore(sessionId: number, round: number, difficulty: "mudah" | "sedang" | "sulit", score: number) {
  const db = await getDb();
  if (!db) return null;
  
  try {
    await db.insert(roundScores).values({ sessionId, round, difficulty, score });
    
    // Update total score
    const session = await db.select().from(olympiadSessions).where(eq(olympiadSessions.id, sessionId)).limit(1);
    if (session.length) {
      const newTotal = session[0].totalScore + score;
      await db.update(olympiadSessions).set({ totalScore: newTotal }).where(eq(olympiadSessions.id, sessionId));
    }
    
    return true;
  } catch (error) {
    console.error("[Database] Failed to save round score:", error);
    return null;
  }
}

export async function getRoundScores(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  try {
    return await db.select().from(roundScores).where(eq(roundScores.sessionId, sessionId));
  } catch (error) {
    console.error("[Database] Failed to get round scores:", error);
    return [];
  }
}
