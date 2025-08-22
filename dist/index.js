var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/supabaseAuth.ts
import { createClient } from "@supabase/supabase-js";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  betStatusEnum: () => betStatusEnum,
  betTypeEnum: () => betTypeEnum,
  bets: () => bets,
  insertBetSchema: () => insertBetSchema,
  sessions: () => sessions,
  updateBetSchema: () => updateBetSchema,
  users: () => users
});
import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  decimal,
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
  id: varchar("id").primaryKey(),
  // Supabase user ID
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  // Will store username or email prefix
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var betTypeEnum = pgEnum("bet_type", [
  "surebet",
  "giros",
  "superodd",
  "dnc",
  "gastos",
  "bingos",
  "extracao"
]);
var betStatusEnum = pgEnum("bet_status", [
  "pending",
  "completed",
  "lost"
]);
var bets = pgTable("bets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stake: decimal("stake", { precision: 12, scale: 2 }).notNull(),
  payout: decimal("payout", { precision: 12, scale: 2 }).notNull(),
  profit: decimal("profit", { precision: 12, scale: 2 }).generatedAlwaysAs(sql`payout - stake`),
  betType: betTypeEnum("bet_type").notNull(),
  status: betStatusEnum("status").default("pending").notNull(),
  house: varchar("house"),
  description: varchar("description"),
  placedAt: timestamp("placed_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertBetSchema = createInsertSchema(bets, {
  stake: z.coerce.string(),
  payout: z.coerce.string(),
  placedAt: z.coerce.date().transform((d) => d.toISOString())
});
var updateBetSchema = insertBetSchema.partial().extend({
  id: z.string()
});

// server/db.ts
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
var { Pool } = pg;
var connectionString = process.env.DATABASE_URL;
var pool = null;
var db = null;
if (connectionString || process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  if (!connectionString && process.env.SUPABASE_URL) {
    console.log("DATABASE_URL not found but Supabase vars available. For full database features:");
    console.log("1. Go to your Supabase project dashboard");
    console.log("2. Settings \u2192 Database \u2192 Connection string \u2192 Nodejs");
    console.log("3. Copy that connection string as DATABASE_URL secret");
    console.log("Running in local mode for now...\n");
  } else {
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
    db = drizzle(pool, { schema: schema_exports });
    console.log("Database connected successfully");
  }
} else {
  console.log("No database configuration found - running in local file storage mode");
}

// server/storage.ts
import { eq, and, desc, sql as sql2, gte, lte, between } from "drizzle-orm";
var DatabaseStorage = class {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async upsertUser(userData) {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: {
        ...userData,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return user;
  }
  // Bet operations
  async getBets(userId, filters) {
    const conditions = [eq(bets.userId, userId)];
    if (filters?.betType) {
      conditions.push(eq(bets.betType, filters.betType));
    }
    if (filters?.house) {
      conditions.push(eq(bets.house, filters.house));
    }
    if (filters?.startDate && filters?.endDate) {
      conditions.push(between(bets.placedAt, new Date(filters.startDate), new Date(filters.endDate)));
    } else if (filters?.startDate) {
      conditions.push(gte(bets.placedAt, new Date(filters.startDate)));
    } else if (filters?.endDate) {
      conditions.push(lte(bets.placedAt, new Date(filters.endDate)));
    }
    return db.select().from(bets).where(and(...conditions)).orderBy(desc(bets.placedAt));
  }
  async getBet(id, userId) {
    const [bet] = await db.select().from(bets).where(and(eq(bets.id, id), eq(bets.userId, userId)));
    return bet;
  }
  async createBet(bet) {
    const [created] = await db.insert(bets).values({
      ...bet,
      placedAt: createBrazilDate(bet.placedAt)
    }).returning();
    return created;
  }
  async updateBet(bet) {
    const { id, ...updates } = bet;
    const updateData = { ...updates, updatedAt: /* @__PURE__ */ new Date() };
    if (updateData.placedAt) {
      updateData.placedAt = createBrazilDate(updateData.placedAt);
    }
    const [updated] = await db.update(bets).set(updateData).where(eq(bets.id, id)).returning();
    return updated;
  }
  async deleteBet(id, userId) {
    await db.delete(bets).where(and(eq(bets.id, id), eq(bets.userId, userId)));
  }
  async getBetStats(userId, filters) {
    const conditions = [eq(bets.userId, userId)];
    if (filters?.betType) {
      conditions.push(eq(bets.betType, filters.betType));
    }
    if (filters?.house) {
      conditions.push(eq(bets.house, filters.house));
    }
    if (filters?.month) {
      const [year, monthNum] = filters.month.split("-");
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);
      conditions.push(between(bets.placedAt, startDate, endDate));
    } else if (filters?.period === "daily") {
      const nowInBrazil = (/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
      const today = new Date(nowInBrazil);
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      conditions.push(between(bets.placedAt, todayStart, todayEnd));
    } else if (filters?.startDate && filters?.endDate) {
      conditions.push(between(bets.placedAt, new Date(filters.startDate), new Date(filters.endDate)));
    }
    const [stats] = await db.select({
      totalStake: sql2`COALESCE(SUM(${bets.stake}::numeric), 0)`,
      totalPayout: sql2`COALESCE(SUM(${bets.payout}::numeric), 0)`,
      totalProfit: sql2`COALESCE(SUM((${bets.payout} - ${bets.stake})::numeric), 0)`,
      totalBets: sql2`COUNT(*)`
    }).from(bets).where(and(...conditions));
    const roi = stats.totalStake > 0 ? stats.totalProfit / stats.totalStake * 100 : 0;
    let dateFormat = "YYYY-MM-DD";
    if (filters?.period === "monthly") {
      dateFormat = "YYYY-MM";
    } else if (filters?.period === "yearly") {
      dateFormat = "YYYY";
    }
    const profitByDate = await db.select({
      date: sql2`TO_CHAR(${bets.placedAt} AT TIME ZONE 'America/Sao_Paulo', '${dateFormat}')`,
      profit: sql2`COALESCE(SUM((${bets.payout} - ${bets.stake})::numeric), 0)`,
      stake: sql2`COALESCE(SUM(${bets.stake}::numeric), 0)`,
      payout: sql2`COALESCE(SUM(${bets.payout}::numeric), 0)`
    }).from(bets).where(and(...conditions)).groupBy(sql2`TO_CHAR(${bets.placedAt} AT TIME ZONE 'America/Sao_Paulo', '${dateFormat}')`).orderBy(sql2`TO_CHAR(${bets.placedAt} AT TIME ZONE 'America/Sao_Paulo', '${dateFormat}')`);
    return {
      ...stats,
      roi,
      profitByDate
    };
  }
};
function createBrazilDate(dateString) {
  if (!dateString) {
    return /* @__PURE__ */ new Date();
  }
  if (dateString.includes("T")) {
    return new Date(dateString);
  }
  const [year, month, day] = dateString.split("-").map(Number);
  const brazilDate = /* @__PURE__ */ new Date();
  brazilDate.setFullYear(year, month - 1, day);
  brazilDate.setHours(12, 0, 0, 0);
  return brazilDate;
}
var storage = new DatabaseStorage();

// server/supabaseAuth.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";
var supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
} else {
  console.log("Supabase not configured - running in local mode without authentication");
}
var USERS_DIR = path.join(process.cwd(), "local-storage");
var USERS_FILE = path.join(USERS_DIR, "users.json");
if (!fs.existsSync(USERS_DIR)) {
  fs.mkdirSync(USERS_DIR, { recursive: true });
}
function hashPassword(password) {
  return crypto.createHash("sha256").update(password + "salt-key-2025").digest("hex");
}
function loadLocalUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading users:", error);
  }
  return [];
}
function saveLocalUsers(users2) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users2, null, 2));
  } catch (error) {
    console.error("Error saving users:", error);
  }
}
function findUserByUsername(username) {
  const users2 = loadLocalUsers();
  return users2.find((user) => user.username === username);
}
function createLocalUser(username, password) {
  const users2 = loadLocalUsers();
  if (users2.find((user) => user.username === username)) {
    throw new Error("Usu\xE1rio j\xE1 existe");
  }
  const newUser = {
    id: `user-${username}`,
    username,
    email: `${username}@local.com`,
    passwordHash: hashPassword(password),
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  users2.push(newUser);
  saveLocalUsers(users2);
  return newUser;
}
function verifyUserPassword(username, password) {
  const user = findUserByUsername(username);
  if (!user) {
    return null;
  }
  const hashedPassword = hashPassword(password);
  if (user.passwordHash === hashedPassword) {
    return user;
  }
  return null;
}
function clearAllLocalUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      fs.unlinkSync(USERS_FILE);
      console.log("All local users cleared");
    }
  } catch (error) {
    console.error("Error clearing users:", error);
  }
}
var isAuthenticated = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No authorization token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    if (token.startsWith("token-")) {
      const parts = token.split("-");
      if (parts.length >= 3) {
        const username = parts[1];
        const timestamp2 = parts[2];
        const mockUser = {
          id: `user-${username}`,
          email: `${username}@local.com`,
          user_metadata: {
            username
          }
        };
        console.log("Authenticated simple user:", mockUser.id);
        req.user = mockUser;
        next();
        return;
      } else {
        console.log("Invalid token format:", token);
        return res.status(401).json({ message: "Invalid token format" });
      }
    }
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    try {
      await storage.upsertUser({
        id: user.id,
        email: user.email,
        firstName: user.user_metadata?.username || user.email.split("@")[0],
        lastName: null,
        profileImageUrl: user.user_metadata?.avatar_url || null
      });
    } catch (dbError) {
      console.warn("Database unavailable, continuing without persisting user:", dbError.message);
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ message: "Authentication failed" });
  }
};
function setupAuth(app2) {
  app2.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, username } = req.body;
      if (email && email.includes("@")) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username
            }
          }
        });
        if (error) {
          return res.status(400).json({ message: error.message });
        }
        if (data.session) {
          res.json({
            user: data.user,
            session: data.session,
            access_token: data.session.access_token,
            message: "Account created and logged in successfully"
          });
        } else {
          res.json({
            user: data.user,
            session: null,
            access_token: null,
            message: "Conta criada! Para desabilitar a confirma\xE7\xE3o por email, v\xE1 em Supabase Dashboard \u2192 Authentication \u2192 Settings \u2192 Enable email confirmations = OFF"
          });
        }
      } else {
        if (!username || username.length < 3) {
          return res.status(400).json({ message: "Username deve ter pelo menos 3 caracteres" });
        }
        if (username.includes(" ")) {
          return res.status(400).json({ message: "Username n\xE3o pode conter espa\xE7os" });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          return res.status(400).json({ message: "Username pode conter apenas letras, n\xFAmeros e underscore (_)" });
        }
        if (!password || password.length < 6) {
          return res.status(400).json({ message: "Senha deve ter pelo menos 6 caracteres" });
        }
        try {
          const localUser = createLocalUser(username, password);
          const access_token = `token-${username}-${Date.now()}`;
          res.json({
            user: {
              id: localUser.id,
              email: localUser.email,
              user_metadata: {
                username: localUser.username
              }
            },
            session: { access_token },
            access_token,
            message: "Conta criada com sucesso!"
          });
        } catch (error) {
          return res.status(400).json({ message: error.message });
        }
      }
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to sign up" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email: usernameOrEmail, password } = req.body;
      if (usernameOrEmail.includes("@")) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: usernameOrEmail,
          password
        });
        if (error) {
          return res.status(400).json({ message: error.message });
        }
        res.json({
          user: data.user,
          session: data.session,
          access_token: data.session?.access_token || null
        });
      } else {
        if (!password || password.length < 6) {
          return res.status(400).json({ message: "Senha inv\xE1lida" });
        }
        const localUser = verifyUserPassword(usernameOrEmail, password);
        if (!localUser) {
          return res.status(400).json({ message: "Usu\xE1rio ou senha incorretos" });
        }
        const mockUser = {
          id: localUser.id,
          email: localUser.email,
          user_metadata: {
            username: localUser.username
          }
        };
        const access_token = `token-${localUser.username}-${Date.now()}`;
        res.json({
          user: mockUser,
          session: { access_token },
          access_token
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to log in" });
    }
  });
  app2.post("/api/auth/logout", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        await supabase.auth.admin.signOut(token);
      }
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.json({ message: "Logged out" });
    }
  });
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      let dbUser;
      try {
        dbUser = await storage.getUser(user.id);
      } catch (dbError) {
        console.warn("Database unavailable for user fetch, using Supabase data:", dbError.message);
      }
      res.json({
        id: user.id,
        email: user.email,
        firstName: dbUser?.firstName || user.user_metadata?.username || user.email?.split("@")[0],
        profileImageUrl: user.user_metadata?.avatar_url || null
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.post("/api/auth/clear-all-data", async (req, res) => {
    try {
      clearAllLocalUsers();
      res.json({
        message: "Todos os dados de usu\xE1rio foram removidos",
        clientAction: "clearLocalStorage"
      });
    } catch (error) {
      console.error("Error clearing data:", error);
      res.status(500).json({ message: "Erro ao limpar dados" });
    }
  });
}

// server/routes.ts
import fs2 from "fs";
import path2 from "path";
var STORAGE_DIR = path2.join(process.cwd(), "local-storage");
var BETS_FILE = path2.join(STORAGE_DIR, "bets.json");
var COUNTER_FILE = path2.join(STORAGE_DIR, "counter.json");
if (!fs2.existsSync(STORAGE_DIR)) {
  fs2.mkdirSync(STORAGE_DIR, { recursive: true });
}
function loadLocalBets() {
  try {
    if (fs2.existsSync(BETS_FILE)) {
      const data = fs2.readFileSync(BETS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading bets:", error);
  }
  return [];
}
function loadBetCounter() {
  try {
    if (fs2.existsSync(COUNTER_FILE)) {
      const data = fs2.readFileSync(COUNTER_FILE, "utf8");
      return JSON.parse(data).counter || 1;
    }
  } catch (error) {
    console.error("Error loading counter:", error);
  }
  return 1;
}
function saveLocalBets(bets2) {
  try {
    fs2.writeFileSync(BETS_FILE, JSON.stringify(bets2, null, 2));
  } catch (error) {
    console.error("Error saving bets:", error);
  }
}
function saveBetCounter(counter) {
  try {
    fs2.writeFileSync(COUNTER_FILE, JSON.stringify({ counter }, null, 2));
  } catch (error) {
    console.error("Error saving counter:", error);
  }
}
var localBets = loadLocalBets();
var betIdCounter = loadBetCounter();
function cleanupOldBets(userId) {
  try {
    const nowInBrazil = (/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    const today = new Date(nowInBrazil);
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const userBets = localBets.filter((bet) => bet.userId === userId);
    const oldBets = userBets.filter((bet) => {
      const betDate = new Date(bet.placedAt);
      return betDate < todayStart;
    });
    if (oldBets.length > 0) {
      console.log(`Cleaning up ${oldBets.length} old bets for user ${userId}`);
      oldBets.forEach((bet) => {
        const betIndex = localBets.findIndex((b) => b.id === bet.id);
        if (betIndex !== -1) {
          localBets[betIndex].archived = true;
        }
      });
      saveLocalBets(localBets);
    }
  } catch (error) {
    console.error("Error cleaning up old bets:", error);
  }
}
async function registerRoutes(app2) {
  setupAuth(app2);
  app2.get("/api/bets", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      try {
        const bets2 = await storage.getBets(userId);
        res.json(bets2);
        return;
      } catch (dbError) {
        console.warn("Database unavailable, using local storage:", dbError);
        const userBets = localBets.filter((bet) => bet.userId === userId).map((bet) => ({
          ...bet,
          placedAt: bet.placedAt.toISOString ? bet.placedAt.toISOString() : bet.placedAt,
          createdAt: bet.createdAt.toISOString ? bet.createdAt.toISOString() : bet.createdAt,
          updatedAt: bet.updatedAt.toISOString ? bet.updatedAt.toISOString() : bet.updatedAt
        })).sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
        res.json(userBets);
      }
    } catch (error) {
      console.error("Error fetching bets:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/bets/months", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      try {
        const bets2 = await storage.getBets(userId);
        const months = /* @__PURE__ */ new Set();
        bets2.forEach((bet) => {
          const date = new Date(bet.placedAt);
          const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          months.add(month);
        });
        const sortedMonths = Array.from(months).sort().reverse();
        res.json(sortedMonths);
        return;
      } catch (dbError) {
        console.warn("Database unavailable, using local storage:", dbError);
        const userBets = localBets.filter((bet) => bet.userId === userId);
        const months = /* @__PURE__ */ new Set();
        userBets.forEach((bet) => {
          const date = new Date(bet.placedAt);
          const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          months.add(month);
        });
        const sortedMonths = Array.from(months).sort().reverse();
        res.json(sortedMonths);
      }
    } catch (error) {
      console.error("Error fetching available months:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/bets/years", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      try {
        const bets2 = await storage.getBets(userId);
        const years = /* @__PURE__ */ new Set();
        bets2.forEach((bet) => {
          const date = new Date(bet.placedAt);
          const year = date.getFullYear().toString();
          years.add(year);
        });
        const sortedYears = Array.from(years).sort().reverse();
        res.json(sortedYears);
        return;
      } catch (dbError) {
        console.warn("Database unavailable, using local storage:", dbError);
        const userBets = localBets.filter((bet) => bet.userId === userId);
        const years = /* @__PURE__ */ new Set();
        userBets.forEach((bet) => {
          const date = new Date(bet.placedAt);
          const year = date.getFullYear().toString();
          years.add(year);
        });
        const sortedYears = Array.from(years).sort().reverse();
        res.json(sortedYears);
      }
    } catch (error) {
      console.error("Error fetching available years:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/bets/stats/previous", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const { period = "daily" } = req.query;
      const now = /* @__PURE__ */ new Date();
      let startDate;
      let endDate;
      if (period === "daily") {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
      } else if (period === "monthly") {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      } else {
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      }
      const userBets = localBets.filter((bet) => {
        const betDate = new Date(bet.placedAt);
        return bet.userId === userId && betDate >= startDate && betDate <= endDate;
      });
      const finishedBets = userBets.filter((bet) => bet.status === "completed" || bet.status === "lost");
      const completedBets = userBets.filter((bet) => bet.status === "completed");
      const totalStake = finishedBets.reduce((sum, bet) => sum + parseFloat(bet.stake), 0);
      const totalPayout = completedBets.reduce((sum, bet) => sum + parseFloat(bet.payout), 0);
      const totalProfit = totalPayout - totalStake;
      const winRate = finishedBets.length > 0 ? completedBets.length / finishedBets.length * 100 : 0;
      const roi = totalStake > 0 ? totalProfit / totalStake * 100 : 0;
      res.json({
        totalBets: finishedBets.length,
        totalStake,
        totalPayout,
        totalProfit,
        winRate,
        roi,
        profitByDate: []
      });
    } catch (error) {
      console.error("Error getting previous period stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/bets/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const { period = "daily", month, year } = req.query;
      try {
        const stats = await storage.getBetStats(userId, { period, month, year });
        res.json(stats);
        return;
      } catch (dbError) {
        console.warn("Database unavailable, using local storage:", dbError);
        let userBets = localBets.filter((bet) => bet.userId === userId);
        if (month) {
          const [filterYear, monthNum] = month.split("-");
          const startDate = new Date(parseInt(filterYear), parseInt(monthNum) - 1, 1);
          const endDate = new Date(parseInt(filterYear), parseInt(monthNum), 0, 23, 59, 59, 999);
          userBets = userBets.filter((bet) => {
            const betDate = new Date(bet.placedAt);
            return betDate >= startDate && betDate <= endDate;
          });
        } else if (year) {
          const startDate = new Date(parseInt(year), 0, 1);
          const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
          userBets = userBets.filter((bet) => {
            const betDate = new Date(bet.placedAt);
            return betDate >= startDate && betDate <= endDate;
          });
        } else if (period) {
          const nowInBrazil = (/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
          const now = new Date(nowInBrazil);
          let startDate = null;
          let endDate = null;
          if (period === "daily") {
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(now);
            todayEnd.setHours(23, 59, 59, 999);
            startDate = todayStart;
            endDate = todayEnd;
          } else if (period === "monthly") {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          } else if (period === "yearly") {
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
          }
          if (startDate && endDate) {
            userBets = userBets.filter((bet) => {
              const betDate = new Date(bet.placedAt);
              return betDate >= startDate && betDate <= endDate;
            });
          }
        }
        if (period === "daily") {
          cleanupOldBets(userId);
        }
        const finishedBets = userBets.filter((bet) => bet.status === "completed" || bet.status === "lost");
        const completedBets = userBets.filter((bet) => bet.status === "completed");
        const totalStake = finishedBets.reduce((sum, bet) => sum + parseFloat(bet.stake), 0);
        const totalPayout = completedBets.reduce((sum, bet) => sum + parseFloat(bet.payout), 0);
        const totalProfit = totalPayout - totalStake;
        const winRate = finishedBets.length > 0 ? completedBets.length / finishedBets.length * 100 : 0;
        const roi = totalStake > 0 ? totalProfit / totalStake * 100 : 0;
        const profitByDate = [];
        const dateGroups = /* @__PURE__ */ new Map();
        for (const bet of finishedBets) {
          const betDate = new Date(bet.placedAt);
          const date = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Sao_Paulo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
          }).format(betDate);
          const profit = bet.status === "completed" ? parseFloat(bet.payout) - parseFloat(bet.stake) : -parseFloat(bet.stake);
          if (!dateGroups.has(date)) {
            dateGroups.set(date, { profit: 0, stake: 0, payout: 0 });
          }
          const group = dateGroups.get(date);
          group.profit += profit;
          group.stake += parseFloat(bet.stake);
          if (bet.status === "completed") {
            group.payout += parseFloat(bet.payout);
          }
        }
        dateGroups.forEach((data, date) => {
          profitByDate.push({
            date,
            profit: data.profit,
            stake: data.stake,
            payout: data.payout
          });
        });
        profitByDate.sort((a, b) => a.date.localeCompare(b.date));
        const stats = {
          totalBets: finishedBets.length,
          totalStake,
          totalPayout,
          totalProfit,
          winRate,
          roi,
          profitByDate
        };
        res.json(stats);
      }
    } catch (error) {
      console.error("Error fetching bet stats:", error);
      res.status(500).json({ message: "Failed to fetch bet stats" });
    }
  });
  app2.post("/api/bets", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const { stake, payout, betType, house, description, placedAt } = req.body;
      const betData = {
        userId,
        stake,
        payout,
        betType,
        house: house || null,
        description: description || null,
        placedAt
      };
      try {
        const newBet = await storage.createBet(betData);
        console.log("Created database bet:", newBet);
        res.json(newBet);
        return;
      } catch (dbError) {
        console.warn("Database unavailable, using local storage:", dbError);
        const stakeNum = parseFloat(stake);
        const payoutNum = parseFloat(payout);
        const newBet = {
          id: `bet-${betIdCounter++}`,
          userId,
          stake,
          payout,
          profit: (payoutNum - stakeNum).toString(),
          betType,
          status: "pending",
          house: house || null,
          description: description || null,
          placedAt: placedAt ? createBrazilDate(placedAt) : /* @__PURE__ */ new Date(),
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        localBets.push(newBet);
        saveBetCounter(betIdCounter);
        saveLocalBets(localBets);
        console.log("Created local bet:", newBet);
        res.json({
          ...newBet,
          placedAt: newBet.placedAt.toISOString(),
          createdAt: newBet.createdAt.toISOString(),
          updatedAt: newBet.updatedAt.toISOString()
        });
      }
    } catch (error) {
      console.error("Error creating bet:", error);
      res.status(500).json({ message: "Failed to create bet" });
    }
  });
  app2.patch("/api/bets/:id/status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const betId = req.params.id;
      const { status } = req.body;
      if (!["pending", "completed", "lost"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      try {
        const updatedBet = await storage.updateBet({ id: betId, status });
        console.log("Updated database bet status:", updatedBet);
        res.json(updatedBet);
        return;
      } catch (dbError) {
        console.warn("Database unavailable, using local storage:", dbError);
        const betIndex = localBets.findIndex((bet2) => bet2.id === betId && bet2.userId === userId);
        if (betIndex === -1) {
          return res.status(404).json({ message: "Bet not found" });
        }
        const bet = localBets[betIndex];
        bet.status = status;
        bet.updatedAt = /* @__PURE__ */ new Date();
        const stakeNum = parseFloat(bet.stake);
        const payoutNum = parseFloat(bet.payout);
        if (status === "completed") {
          bet.profit = (payoutNum - stakeNum).toString();
        } else if (status === "lost") {
          bet.profit = (-stakeNum).toString();
        } else {
          bet.profit = "0";
        }
        saveLocalBets(localBets);
        console.log("Updated bet status:", bet);
        res.json({
          ...bet,
          placedAt: bet.placedAt.toISOString ? bet.placedAt.toISOString() : bet.placedAt,
          createdAt: bet.createdAt.toISOString ? bet.createdAt.toISOString() : bet.createdAt,
          updatedAt: bet.updatedAt.toISOString()
        });
      }
    } catch (error) {
      console.error("Error updating bet status:", error);
      res.status(500).json({ message: "Failed to update bet status" });
    }
  });
  app2.delete("/api/bets/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.id;
      const betId = req.params.id;
      try {
        await storage.deleteBet(betId, userId);
        console.log("Deleted database bet:", betId);
        res.json({ message: "Bet deleted successfully" });
        return;
      } catch (dbError) {
        console.warn("Database unavailable, using local storage:", dbError);
        const betIndex = localBets.findIndex((bet) => bet.id === betId && bet.userId === userId);
        if (betIndex === -1) {
          return res.status(404).json({ message: "Bet not found" });
        }
        localBets.splice(betIndex, 1);
        saveLocalBets(localBets);
        console.log("Deleted bet:", betId);
        res.json({ message: "Bet deleted successfully" });
      }
    } catch (error) {
      console.error("Error deleting bet:", error);
      res.status(500).json({ message: "Failed to delete bet" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs3 from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path3 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path3.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path3.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
