import { createClient } from '@supabase/supabase-js';
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Make Supabase optional for local development without authentication
let supabase: any = null;

if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
} else {
  console.log("Supabase not configured - running in local mode without authentication");
}

export { supabase };

// Local storage for users with authentication
const USERS_DIR = path.join(process.cwd(), 'local-storage');
const USERS_FILE = path.join(USERS_DIR, 'users.json');

// Ensure storage directory exists
if (!fs.existsSync(USERS_DIR)) {
  fs.mkdirSync(USERS_DIR, { recursive: true });
}

interface LocalUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'salt-key-2025').digest('hex');
}

function loadLocalUsers(): LocalUser[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
  return [];
}

function saveLocalUsers(users: LocalUser[]): void {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

function findUserByUsername(username: string): LocalUser | undefined {
  const users = loadLocalUsers();
  return users.find(user => user.username === username);
}

function createLocalUser(username: string, password: string): LocalUser {
  const users = loadLocalUsers();
  
  // Check if user already exists
  if (users.find(user => user.username === username)) {
    throw new Error('Usuário já existe');
  }
  
  const newUser: LocalUser = {
    id: `user-${username}`,
    username,
    email: `${username}@local.com`,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  saveLocalUsers(users);
  return newUser;
}

function verifyUserPassword(username: string, password: string): LocalUser | null {
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

// Clear all local users on startup
function clearAllLocalUsers(): void {
  try {
    if (fs.existsSync(USERS_FILE)) {
      fs.unlinkSync(USERS_FILE);
      console.log('All local users cleared');
    }
  } catch (error) {
    console.error('Error clearing users:', error);
  }
}

// Clear users when server starts - COMMENTED OUT TO FIX LOGIN ISSUES
// clearAllLocalUsers();

// Middleware to verify JWT token from Supabase or simple token
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "No authorization token provided" });
  }

  const token = authHeader.split(' ')[1];

  try {
    // All users now use Supabase authentication
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Try to ensure user exists in our database (skip if database is not available)
    try {
      await storage.upsertUser({
        id: user.id,
        email: user.email!,
        firstName: user.user_metadata?.username || user.email!.split('@')[0],
        lastName: null,
        profileImageUrl: user.user_metadata?.avatar_url || null,
      });
    } catch (dbError: any) {
      console.warn("Database unavailable, continuing without persisting user:", dbError.message);
    }

    // Add user to request object
    (req as any).user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ message: "Authentication failed" });
  }
};

export function setupAuth(app: Express) {
  // Auth routes
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, username } = req.body;

      // If email is provided, use Supabase
      if (email && email.includes('@')) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
            }
          }
        });

        if (error) {
          return res.status(400).json({ message: error.message });
        }

        // If email confirmation is disabled, data.session will be available
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
            message: "Conta criada! Para desabilitar a confirmação por email, vá em Supabase Dashboard → Authentication → Settings → Enable email confirmations = OFF"
          });
        }
      } else {
        // Username-only signup - use Supabase with username as email
        if (!username || username.length < 3) {
          return res.status(400).json({ message: "Username deve ter pelo menos 3 caracteres" });
        }

        if (username.includes(' ')) {
          return res.status(400).json({ message: "Username não pode conter espaços" });
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          return res.status(400).json({ message: "Username pode conter apenas letras, números e underscore (_)" });
        }

        if (!password || password.length < 6) {
          return res.status(400).json({ message: "Senha deve ter pelo menos 6 caracteres" });
        }

        try {
          // Create user in Supabase using username as email
          const email = `${username}@sosa-local.app`;
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                username,
                display_name: username
              }
            }
          });

          if (error) {
            if (error.message.includes('already registered')) {
              return res.status(400).json({ message: "Este username já está sendo usado" });
            }
            return res.status(400).json({ message: error.message });
          }

          // If email confirmation is disabled, data.session will be available
          if (data.session) {
            res.json({
              user: data.user,
              session: data.session,
              access_token: data.session.access_token,
              message: "Conta criada com sucesso!"
            });
          } else {
            res.json({
              user: data.user,
              session: null,
              access_token: null,
              message: "Conta criada! Para desabilitar a confirmação por email, vá em Supabase Dashboard → Authentication → Settings → Enable email confirmations = OFF"
            });
          }
        } catch (error: any) {
          return res.status(400).json({ message: error.message });
        }
      }
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to sign up" });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email: usernameOrEmail, password } = req.body;

      if (!supabase) {
        return res.status(500).json({ message: "Authentication service not configured" });
      }

      // If it contains @, treat as email; otherwise, treat as username
      if (usernameOrEmail.includes('@') && !usernameOrEmail.includes('@sosa-local.app')) {
        // Real email login
        const { data, error } = await supabase.auth.signInWithPassword({
          email: usernameOrEmail,
          password,
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
        // Username login - convert to email format and login via Supabase
        const email = usernameOrEmail.includes('@') ? usernameOrEmail : `${usernameOrEmail}@sosa-local.app`;
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            return res.status(400).json({ message: "Usuário ou senha incorretos" });
          }
          return res.status(400).json({ message: error.message });
        }

        res.json({
          user: data.user,
          session: data.session,
          access_token: data.session?.access_token || null
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to log in" });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        await supabase.auth.admin.signOut(token);
      }
      
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.json({ message: "Logged out" }); // Always succeed logout
    }
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      // Try to get user from database, but fallback to Supabase data if database unavailable
      let dbUser;
      try {
        dbUser = await storage.getUser(user.id);
      } catch (dbError: any) {
        console.warn("Database unavailable for user fetch, using Supabase data:", dbError.message);
      }
      
      res.json({
        id: user.id,
        email: user.email,
        firstName: dbUser?.firstName || user.user_metadata?.username || user.email?.split('@')[0],
        profileImageUrl: dbUser?.profileImageUrl || user.user_metadata?.avatar_url || null,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Clear all user data endpoint
  app.post('/api/auth/clear-all-data', async (req, res) => {
    try {
      clearAllLocalUsers();
      res.json({ 
        message: "Todos os dados de usuário foram removidos",
        clientAction: "clearLocalStorage"
      });
    } catch (error) {
      console.error("Error clearing data:", error);
      res.status(500).json({ message: "Erro ao limpar dados" });
    }
  });
}