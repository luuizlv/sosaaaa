import { createClient } from '@supabase/supabase-js';
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

// Initialize Supabase client
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export { supabase };

// Middleware to validate JWT tokens from Supabase
export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  const authorization = req.headers.authorization;
  
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  const token = authorization.split(' ')[1];
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Erro de autenticação' });
  }
};

export function setupSupabaseAuth(app: Express) {
  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(401).json({ error: error.message });
      }

      if (!data.user || !data.session) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Ensure user exists in our database
      try {
        await storage.upsertUser({
          id: data.user.id,
          email: data.user.email!,
          firstName: data.user.user_metadata?.firstName || data.user.email!.split('@')[0],
          lastName: data.user.user_metadata?.lastName || '',
          profileImageUrl: data.user.user_metadata?.avatar_url || null,
        });
      } catch (dbError) {
        console.error('Error upserting user:', dbError);
      }

      res.json({
        user: {
          id: data.user.id,
          email: data.user.email,
          firstName: data.user.user_metadata?.firstName || data.user.email!.split('@')[0],
          lastName: data.user.user_metadata?.lastName || '',
          profileImageUrl: data.user.user_metadata?.avatar_url || null,
        },
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Register endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstName: firstName || email.split('@')[0],
            lastName: lastName || '',
          }
        }
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      if (!data.user) {
        return res.status(400).json({ error: 'Erro ao criar usuário' });
      }

      // If user is automatically confirmed, create user in database
      if (data.user.email_confirmed_at) {
        try {
          await storage.upsertUser({
            id: data.user.id,
            email: data.user.email!,
            firstName: firstName || data.user.email!.split('@')[0],
            lastName: lastName || '',
            profileImageUrl: null,
          });
        } catch (dbError) {
          console.error('Error creating user in database:', dbError);
        }
      }

      res.json({
        message: data.user.email_confirmed_at 
          ? 'Usuário criado com sucesso' 
          : 'Verifique seu email para confirmar a conta',
        user: data.user.email_confirmed_at ? {
          id: data.user.id,
          email: data.user.email,
          firstName: firstName || data.user.email!.split('@')[0],
          lastName: lastName || '',
        } : null,
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Get current user endpoint
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      // Get user from database or create if doesn't exist
      let dbUser;
      try {
        dbUser = await storage.getUser(user.id);
        if (!dbUser) {
          dbUser = await storage.upsertUser({
            id: user.id,
            email: user.email!,
            firstName: user.user_metadata?.firstName || user.email!.split('@')[0],
            lastName: user.user_metadata?.lastName || '',
            profileImageUrl: user.user_metadata?.avatar_url || null,
          });
        }
      } catch (dbError) {
        console.error('Error getting user from database:', dbError);
        dbUser = {
          id: user.id,
          email: user.email,
          firstName: user.user_metadata?.firstName || user.email!.split('@')[0],
          lastName: user.user_metadata?.lastName || '',
          profileImageUrl: user.user_metadata?.avatar_url || null,
        };
      }

      res.json(dbUser);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", async (req, res) => {
    try {
      const authorization = req.headers.authorization;
      
      if (authorization && authorization.startsWith('Bearer ')) {
        const token = authorization.split(' ')[1];
        await supabase.auth.signOut();
      }

      res.json({ message: "Logout realizado com sucesso" });
    } catch (error) {
      console.error("Logout error:", error);
      res.json({ message: "Logout realizado com sucesso" });
    }
  });
}