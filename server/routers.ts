import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createOlympiadSession, getSessionByToken, updateSessionPhase, advanceRound, saveRoundScore, getRoundScores } from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  olympiad: router({
    validateToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const validToken = "OS2J8U";
        if (input.token !== validToken) {
          return { valid: false, message: "Token tidak valid" };
        }
        return { valid: true, message: "Token valid" };
      }),
    
    startSession: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const validToken = "OS2J8U";
        if (input.token !== validToken) {
          return { success: false, message: "Token tidak valid" };
        }
        
        const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await createOlympiadSession(sessionToken);
        
        return { success: true, sessionToken };
      }),
    
    getSession: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .query(async ({ input }) => {
        const session = await getSessionByToken(input.sessionToken);
        if (!session) {
          return { found: false };
        }
        return { found: true, session };
      }),
    
    selectDifficulty: publicProcedure
      .input(z.object({ sessionToken: z.string(), difficulty: z.enum(["mudah", "sedang", "sulit"]) }))
      .mutation(async ({ input }) => {
        const session = await getSessionByToken(input.sessionToken);
        if (!session) {
          return { success: false, message: "Session tidak ditemukan" };
        }
        
        await updateSessionPhase(session.id, "question", input.difficulty);
        return { success: true };
      }),
    
    advanceToNextRound: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .mutation(async ({ input }) => {
        const session = await getSessionByToken(input.sessionToken);
        if (!session) {
          return { success: false, message: "Session tidak ditemukan" };
        }
        
        const result = await advanceRound(session.id);
        return { success: true, ...result };
      }),
    
    getQuestionImage: publicProcedure
      .input(z.object({ set: z.string(), difficulty: z.enum(["mudah", "sedang", "sulit"]) }))
      .query(async ({ input }) => {
        const diffMap = { mudah: "1", sedang: "2", sulit: "3" };
        const questionName = `${input.set}${diffMap[input.difficulty]}`;
        return { questionName, imagePath: `/questions/${questionName}.png` };
      }),
    
    getRoundScores: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .query(async ({ input }) => {
        const session = await getSessionByToken(input.sessionToken);
        if (!session) {
          return { scores: [] };
        }
        
        const scores = await getRoundScores(session.id);
        return { scores };
      }),
  }),
});

export type AppRouter = typeof appRouter;
