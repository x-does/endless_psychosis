import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createDatabase, ensureSchema, getDb, pingDatabase } from "./db.js";
import { saves } from "./schema.js";

const APP_VERSION = process.env.APP_VERSION ?? "0.1.0";

const SavePayload = z
  .object({
    version: z.number().int().positive(),
    createdAt: z.string().min(1),
    playerName: z.string().min(1).max(80),
    level: z.number().int().nonnegative(),
    xp: z.number().int().nonnegative(),
    totalXp: z.number().int().nonnegative(),
    learned: z.array(z.string().max(80)).max(200),
    equippedActive: z.string().max(80).nullable(),
    chapterIndex: z.number().int().nonnegative(),
    completedChapters: z.array(z.number().int().nonnegative()).max(50),
    journal: z.array(z.number().int().nonnegative()).max(50),
    bestDistance: z.number().nonnegative(),
    bestEndless: z.number().nonnegative(),
    runs: z.number().int().nonnegative(),
    wins: z.number().int().nonnegative(),
    settings: z
      .object({
        sound: z.boolean(),
        haptics: z.boolean(),
        reduceMotion: z.boolean(),
      })
      .passthrough(),
    lastPlayed: z.string().min(1),
  })
  .passthrough();

const SaveBody = z.object({ save: SavePayload });

function tokenFrom(req: Request): string | null {
  const header = req.get("authorization") ?? "";
  const match = /^Bearer\s+([A-Za-z0-9_-]{16,160})$/.exec(header);
  return match ? match[1] : null;
}

function saveId(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function asyncRoute(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

export function createApp(options: { staging?: boolean; dist?: string; commit?: string } = {}): express.Express {
  const database = options.staging ? createDatabase("DEV_") : { getDb, ensureSchema, pingDatabase };
  const { getDb: appDb, pingDatabase: appPing } = database;
  const ready = database.ensureSchema();
  ready.catch((error) => console.error("[endless] database preparation failed", error));
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "256kb" }));

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      app: "endless",
      version: APP_VERSION,
      environment: options.staging ? "dev" : "production",
      commit: options.commit ?? process.env.APP_COMMIT ?? null,
      time: new Date().toISOString(),
    });
  });

  app.get(
    "/health/db",
    asyncRoute(async (_req, res) => {
      if (!appDb()) {
        res.status(200).json({ status: "not_configured", database: "missing" });
        return;
      }
      try {
        await ready;
        await appPing();
        res.json({ status: "ok", database: "connected" });
      } catch (error) {
        res.status(503).json({
          status: "error",
          database: "unavailable",
        });
      }
    }),
  );

  app.get(
    "/api/save",
    asyncRoute(async (req, res) => {
      const token = tokenFrom(req);
      if (!token) {
        res.status(401).json({ error: "missing_sync_code" });
        return;
      }
      await ready;
      const db = appDb();
      if (!db) {
        res.status(503).json({ error: "database_not_configured" });
        return;
      }
      const rows = await db
        .select()
        .from(saves)
        .where(eq(saves.id, saveId(token)))
        .limit(1);
      const row = rows[0];
      if (!row) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json({
        save: row.data,
        revision: row.revision,
        updatedAt: row.updatedAt,
      });
    }),
  );

  app.put(
    "/api/save",
    asyncRoute(async (req, res) => {
      const token = tokenFrom(req);
      if (!token) {
        res.status(401).json({ error: "missing_sync_code" });
        return;
      }
      const parsed = SaveBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "invalid_save" });
        return;
      }
      await ready;
      const db = appDb();
      if (!db) {
        res.status(503).json({ error: "database_not_configured" });
        return;
      }
      const save = parsed.data.save;
      const id = saveId(token);
      const now = new Date();
      await db
        .insert(saves)
        .values({
          id,
          playerName: save.playerName,
          data: save,
          revision: 1,
          createdAt: now,
          updatedAt: now,
        })
        .onDuplicateKeyUpdate({
          set: {
            playerName: save.playerName,
            data: save,
            revision: sql`${saves.revision} + 1`,
            updatedAt: now,
          },
        });
      const rows = await db
        .select({ revision: saves.revision })
        .from(saves)
        .where(eq(saves.id, id))
        .limit(1);
      res.json({ ok: true, revision: rows[0]?.revision ?? 1 });
    }),
  );

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "not_found" });
  });

  const dist = options.dist ?? path.resolve(__dirname, "../dist");
  const indexPath = path.join(dist, "index.html");
  console.log(`[endless] dist path: ${dist}, index exists: ${fs.existsSync(indexPath)}`);
  if (fs.existsSync(indexPath)) {
    const indexHtml = fs.readFileSync(indexPath, "utf8");
    app.use(express.static(dist, { maxAge: "1h", index: false }));
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api/")) {
        next();
        return;
      }
      res.type("html").send(indexHtml);
    });
  } else {
    console.warn("[endless] dist/index.html not found; static files unavailable");
  }

  app.use(
    (error: unknown, req: Request, res: Response, _next: NextFunction) => {
      console.error(
        `[endless] request failed: ${req.method} ${req.path}`,
        error instanceof Error ? error.stack : error,
      );
      if (!res.headersSent) {
        res.status(500).json({
          error: "internal_error",
        });
      }
    },
  );

  return app;
}

export async function prepare(): Promise<void> {
  if (!getDb()) {
    console.warn("[endless] database not configured; cloud saves disabled");
    return;
  }
  try {
    await ensureSchema();
    console.log("[endless] database schema ready");
  } catch (error) {
    console.error("[endless] database schema setup failed", error);
  }
}
