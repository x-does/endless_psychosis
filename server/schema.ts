import {
  int,
  json,
  mysqlTable,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const saves = mysqlTable("endless_saves", {
  id: varchar("id", { length: 64 }).primaryKey(),
  playerName: varchar("player_name", { length: 80 }).notNull(),
  data: json("data").notNull(),
  revision: int("revision").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export type SaveRow = typeof saves.$inferSelect;
