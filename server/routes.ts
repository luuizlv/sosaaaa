import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupSupabaseAuth, isAuthenticated } from "./supabaseAuth";
import { storage, createBrazilDate } from "./storage";


export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupSupabaseAuth(app);

  // Get all bets for a user
  app.get("/api/bets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const bets = await storage.getBets(userId);
      res.json(bets);
    } catch (error) {
      console.error("Error fetching bets:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get available months from user bets
  app.get("/api/bets/months", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const bets = await storage.getBets(userId);
      const months = new Set<string>();
      
      bets.forEach(bet => {
        const date = new Date(bet.placedAt);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(month);
      });
      
      const sortedMonths = Array.from(months).sort().reverse();
      res.json(sortedMonths);
    } catch (error) {
      console.error("Error fetching available months:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get available years from user bets
  app.get("/api/bets/years", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const bets = await storage.getBets(userId);
      const years = new Set<string>();
      
      bets.forEach(bet => {
        const date = new Date(bet.placedAt);
        const year = date.getFullYear().toString();
        years.add(year);
      });
      
      const sortedYears = Array.from(years).sort().reverse();
      res.json(sortedYears);
    } catch (error) {
      console.error("Error fetching available years:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get bet statistics for previous period
  app.get("/api/bets/stats/previous", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { period = 'daily' } = req.query;
      
      // Calculate previous period dates
      const now = new Date();
      let startDate: string;
      let endDate: string;
      
      if (period === 'daily') {
        // Previous day
        const prevDay = new Date(now);
        prevDay.setDate(prevDay.getDate() - 1);
        startDate = prevDay.toISOString().split('T')[0];
        endDate = prevDay.toISOString().split('T')[0];
      } else if (period === 'monthly') {
        // Previous month
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate = prevMonth.toISOString().split('T')[0];
        const endMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        endDate = endMonth.toISOString().split('T')[0];
      } else {
        // Previous year
        const prevYear = now.getFullYear() - 1;
        startDate = `${prevYear}-01-01`;
        endDate = `${prevYear}-12-31`;
      }
      
      const stats = await storage.getBetStats(userId, { 
        period: period as any, 
        startDate, 
        endDate 
      });
      
      res.json(stats);
    } catch (error) {
      console.error("Error getting previous period stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get bet statistics
  app.get("/api/bets/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { period = 'daily', month, year } = req.query;
      
      const stats = await storage.getBetStats(userId, { period: period as any, month, year });
      res.json(stats);
    } catch (error) {
      console.error("Error fetching bet stats:", error);
      res.status(500).json({ message: "Failed to fetch bet stats" });
    }
  });

  // Create a new bet
  app.post("/api/bets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { stake, payout, betType, house, description, placedAt } = req.body;

      const betData = {
        userId: userId,
        stake: stake,
        payout: payout,
        betType: betType,
        house: house || null,
        description: description || null,
        placedAt: placedAt,
      };

      const newBet = await storage.createBet(betData);
      console.log("Created bet:", newBet);
      res.json(newBet);
    } catch (error) {
      console.error("Error creating bet:", error);
      res.status(500).json({ message: "Failed to create bet" });
    }
  });

  // Update bet status
  app.patch("/api/bets/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const betId = req.params.id;
      const { status } = req.body;
      
      if (!['pending', 'completed', 'lost'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updatedBet = await storage.updateBet({ id: betId, status });
      console.log("Updated bet status:", updatedBet);
      res.json(updatedBet);
    } catch (error) {
      console.error("Error updating bet status:", error);
      res.status(500).json({ message: "Failed to update bet status" });
    }
  });

  // Delete a bet
  app.delete("/api/bets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const betId = req.params.id;
      
      await storage.deleteBet(betId, userId);
      console.log("Deleted bet:", betId);
      res.json({ message: "Bet deleted successfully" });
    } catch (error) {
      console.error("Error deleting bet:", error);
      res.status(500).json({ message: "Failed to delete bet" });
    }
  });

  // Update user profile photo
  app.patch("/api/profile/photo", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { profileImageUrl } = req.body;
      
      if (!profileImageUrl) {
        return res.status(400).json({ message: "Profile image URL is required" });
      }

      const updatedUser = await storage.updateUserProfileImage(userId, profileImageUrl);
      console.log("Updated user profile photo:", updatedUser.id);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile photo:", error);
      res.status(500).json({ message: "Failed to update profile photo" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}