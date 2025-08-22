import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./supabaseAuth";
import { storage, createBrazilDate } from "./storage";

// Local storage for bets and users - saved to file system for persistence
import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), 'local-storage');
const BETS_FILE = path.join(STORAGE_DIR, 'bets.json');
const COUNTER_FILE = path.join(STORAGE_DIR, 'counter.json');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Load local storage from files
function loadLocalBets(): any[] {
  try {
    if (fs.existsSync(BETS_FILE)) {
      const data = fs.readFileSync(BETS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading bets:', error);
  }
  return [];
}

function loadBetCounter(): number {
  try {
    if (fs.existsSync(COUNTER_FILE)) {
      const data = fs.readFileSync(COUNTER_FILE, 'utf8');
      return JSON.parse(data).counter || 1;
    }
  } catch (error) {
    console.error('Error loading counter:', error);
  }
  return 1;
}

function saveLocalBets(bets: any[]): void {
  try {
    fs.writeFileSync(BETS_FILE, JSON.stringify(bets, null, 2));
  } catch (error) {
    console.error('Error saving bets:', error);
  }
}

function saveBetCounter(counter: number): void {
  try {
    fs.writeFileSync(COUNTER_FILE, JSON.stringify({ counter }, null, 2));
  } catch (error) {
    console.error('Error saving counter:', error);
  }
}

let localBets = loadLocalBets();
let betIdCounter = loadBetCounter();

// Cleanup function to move old bets to monthly archive
function cleanupOldBets(userId: string): void {
  try {
    const nowInBrazil = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
    const today = new Date(nowInBrazil);
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    
    // Find bets that are not from today
    const userBets = localBets.filter(bet => bet.userId === userId);
    const oldBets = userBets.filter(bet => {
      const betDate = new Date(bet.placedAt);
      return betDate < todayStart;
    });
    
    if (oldBets.length > 0) {
      console.log(`Cleaning up ${oldBets.length} old bets for user ${userId}`);
      
      // Archive old bets by month (you can implement this later if needed)
      // For now, we just keep them but mark them as archived
      oldBets.forEach(bet => {
        const betIndex = localBets.findIndex(b => b.id === bet.id);
        if (betIndex !== -1) {
          localBets[betIndex].archived = true;
        }
      });
      
      saveLocalBets(localBets);
    }
  } catch (error) {
    console.error('Error cleaning up old bets:', error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Get all bets for a user
  app.get("/api/bets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Try database first, fallback to local storage
      try {
        const bets = await storage.getBets(userId);
        res.json(bets);
        return;
      } catch (dbError) {
        console.warn("Database unavailable, using local storage:", dbError);
        // Fallback to local storage
        const userBets = localBets
          .filter(bet => bet.userId === userId)
          .map(bet => ({
            ...bet,
            placedAt: bet.placedAt.toISOString ? bet.placedAt.toISOString() : bet.placedAt,
            createdAt: bet.createdAt.toISOString ? bet.createdAt.toISOString() : bet.createdAt,
            updatedAt: bet.updatedAt.toISOString ? bet.updatedAt.toISOString() : bet.updatedAt,
          }))
          .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());

        res.json(userBets);
      }
    } catch (error) {
      console.error("Error fetching bets:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get available months from user bets
  app.get("/api/bets/months", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Try database first, fallback to local storage
      try {
        const bets = await storage.getBets(userId);
        const months = new Set<string>();
        
        bets.forEach(bet => {
          const date = new Date(bet.placedAt);
          const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          months.add(month);
        });
        
        const sortedMonths = Array.from(months).sort().reverse(); // Most recent first
        res.json(sortedMonths);
        return;
      } catch (dbError) {
        console.warn("Database unavailable, using local storage:", dbError);
        // Fallback to local storage
        const userBets = localBets.filter(bet => bet.userId === userId);
        const months = new Set<string>();
        
        userBets.forEach(bet => {
          const date = new Date(bet.placedAt);
          const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          months.add(month);
        });
        
        const sortedMonths = Array.from(months).sort().reverse(); // Most recent first
        res.json(sortedMonths);
      }
    } catch (error) {
      console.error("Error fetching available months:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get available years from user bets
  app.get("/api/bets/years", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Try database first, fallback to local storage
      try {
        const bets = await storage.getBets(userId);
        const years = new Set<string>();
        
        bets.forEach(bet => {
          const date = new Date(bet.placedAt);
          const year = date.getFullYear().toString();
          years.add(year);
        });
        
        const sortedYears = Array.from(years).sort().reverse(); // Most recent first
        res.json(sortedYears);
        return;
      } catch (dbError) {
        console.warn("Database unavailable, using local storage:", dbError);
        // Fallback to local storage
        const userBets = localBets.filter(bet => bet.userId === userId);
        const years = new Set<string>();
        
        userBets.forEach(bet => {
          const date = new Date(bet.placedAt);
          const year = date.getFullYear().toString();
          years.add(year);
        });
        
        const sortedYears = Array.from(years).sort().reverse(); // Most recent first
        res.json(sortedYears);
      }
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
      
      // Calculate previous period dates based on current period
      const now = new Date();
      let startDate: Date;
      let endDate: Date;
      
      if (period === 'daily') {
        // Previous day
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
      } else if (period === 'monthly') {
        // Previous month
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      } else {
        // Previous year
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      }
      
      // Fallback to local storage (database would be similar logic)
      const userBets = localBets.filter(bet => {
        const betDate = new Date(bet.placedAt);
        return bet.userId === userId && betDate >= startDate && betDate <= endDate;
      });
      
      const finishedBets = userBets.filter(bet => bet.status === 'completed' || bet.status === 'lost');
      const completedBets = userBets.filter(bet => bet.status === 'completed');
      
      const totalStake = finishedBets.reduce((sum, bet) => sum + parseFloat(bet.stake), 0);
      const totalPayout = completedBets.reduce((sum, bet) => sum + parseFloat(bet.payout), 0);
      const totalProfit = totalPayout - totalStake;
      const winRate = finishedBets.length > 0 ? (completedBets.length / finishedBets.length) * 100 : 0;
      const roi = totalStake > 0 ? (totalProfit / totalStake) * 100 : 0;
      
      // Calculate profitByDate for the local storage fallback
      const profitByDateMap = new Map<string, { profit: number; stake: number; payout: number }>();
      
      finishedBets.forEach(bet => {
        const date = new Date(bet.placedAt).toISOString().split('T')[0]; // YYYY-MM-DD format
        const existing = profitByDateMap.get(date) || { profit: 0, stake: 0, payout: 0 };
        const betProfit = bet.status === 'completed' ? (parseFloat(bet.payout) - parseFloat(bet.stake)) : -parseFloat(bet.stake);
        const betPayout = bet.status === 'completed' ? parseFloat(bet.payout) : 0;
        
        profitByDateMap.set(date, {
          profit: existing.profit + betProfit,
          stake: existing.stake + parseFloat(bet.stake),
          payout: existing.payout + betPayout
        });
      });
      
      const profitByDate = Array.from(profitByDateMap.entries()).map(([date, data]) => ({
        date,
        ...data
      })).sort((a, b) => a.date.localeCompare(b.date));

      res.json({
        totalBets: finishedBets.length,
        totalStake,
        totalPayout,
        totalProfit,
        winRate,
        roi,
        profitByDate
      });
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
      
      // Try database first, fallback to local storage
      try {
        const stats = await storage.getBetStats(userId, { period: period as any, month, year });
        res.json(stats);
        return;
      } catch (dbError) {
        console.warn("Database unavailable, using local storage:", dbError);
        // Fallback to local storage
        let userBets = localBets.filter(bet => bet.userId === userId);
        
        // Apply date filters based on period, month, and year
        if (month) {
          // Filter by specific month
          const [filterYear, monthNum] = month.split('-');
          const startDate = new Date(parseInt(filterYear), parseInt(monthNum) - 1, 1);
          const endDate = new Date(parseInt(filterYear), parseInt(monthNum), 0, 23, 59, 59, 999);
          
          userBets = userBets.filter(bet => {
            const betDate = new Date(bet.placedAt);
            return betDate >= startDate && betDate <= endDate;
          });
        } else if (year) {
          // Filter by specific year
          const startDate = new Date(parseInt(year), 0, 1);
          const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
          
          userBets = userBets.filter(bet => {
            const betDate = new Date(bet.placedAt);
            return betDate >= startDate && betDate <= endDate;
          });
        } else if (period) {
          // Get current time in Brazil timezone
          const nowInBrazil = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
          const now = new Date(nowInBrazil);
          let startDate: Date | null = null;
          let endDate: Date | null = null;
          
          if (period === 'daily') {
            // ONLY show today's bets in Brazil timezone - never fallback to previous days
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(now);
            todayEnd.setHours(23, 59, 59, 999);
            
            startDate = todayStart;
            endDate = todayEnd;
          } else if (period === 'monthly') {
            // Current month
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          } else if (period === 'yearly') {
            // Current year
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
          }
          
          if (startDate && endDate) {
            userBets = userBets.filter(bet => {
              const betDate = new Date(bet.placedAt);
              return betDate >= startDate && betDate <= endDate;
            });
          }
        }
        
        // Clean up old bets automatically when it's a new day
        if (period === 'daily') {
          cleanupOldBets(userId);
        }
        
        // Only count completed and lost bets for statistics
        const finishedBets = userBets.filter(bet => bet.status === 'completed' || bet.status === 'lost');
        const completedBets = userBets.filter(bet => bet.status === 'completed');
        
        const totalStake = finishedBets.reduce((sum, bet) => sum + parseFloat(bet.stake), 0);
        const totalPayout = completedBets.reduce((sum, bet) => sum + parseFloat(bet.payout), 0);
        const totalProfit = totalPayout - totalStake;
        const winRate = finishedBets.length > 0 ? (completedBets.length / finishedBets.length) * 100 : 0;
        const roi = totalStake > 0 ? (totalProfit / totalStake) * 100 : 0;

        // Calculate profit by date for local storage
        const profitByDate: Array<{ date: string; profit: number; stake: number; payout: number }> = [];
        const dateGroups = new Map<string, { profit: number; stake: number; payout: number }>();
        
        for (const bet of finishedBets) {
          // Format date in Brazil timezone
          const betDate = new Date(bet.placedAt);
          const date = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(betDate); // YYYY-MM-DD format
          const profit = bet.status === 'completed' ? parseFloat(bet.payout) - parseFloat(bet.stake) : -parseFloat(bet.stake);
          
          if (!dateGroups.has(date)) {
            dateGroups.set(date, { profit: 0, stake: 0, payout: 0 });
          }
          
          const group = dateGroups.get(date)!;
          group.profit += profit;
          group.stake += parseFloat(bet.stake);
          if (bet.status === 'completed') {
            group.payout += parseFloat(bet.payout);
          }
        }
        
        // Convert map to array and sort by date
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
          totalStake: totalStake,
          totalPayout: totalPayout,
          totalProfit: totalProfit,
          winRate: winRate,
          roi: roi,
          profitByDate: profitByDate
        };

        res.json(stats);
      }
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

      // Try database first, fallback to local storage
      try {
        const newBet = await storage.createBet(betData);
        console.log("Created database bet:", newBet);
        res.json(newBet);
        return;
      } catch (dbError) {
        console.warn("Database unavailable, using local storage:", dbError);
        // Fallback to local storage
        const stakeNum = parseFloat(stake);
        const payoutNum = parseFloat(payout);
        
        const newBet = {
          id: `bet-${betIdCounter++}`,
          userId: userId,
          stake: stake,
          payout: payout,
          profit: (payoutNum - stakeNum).toString(),
          betType: betType,
          status: 'pending',
          house: house || null,
          description: description || null,
          placedAt: placedAt ? createBrazilDate(placedAt) : new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        localBets.push(newBet);
        saveBetCounter(betIdCounter);
        saveLocalBets(localBets);
        console.log("Created local bet:", newBet);
        
        res.json({
          ...newBet,
          placedAt: newBet.placedAt.toISOString(),
          createdAt: newBet.createdAt.toISOString(),
          updatedAt: newBet.updatedAt.toISOString(),
        });
      }
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

      // Try database first, fallback to local storage
      try {
        const updatedBet = await storage.updateBet({ id: betId, status });
        console.log("Updated database bet status:", updatedBet);
        res.json(updatedBet);
        return;
      } catch (dbError) {
        console.warn("Database unavailable, using local storage:", dbError);
        // Fallback to local storage
        const betIndex = localBets.findIndex(bet => bet.id === betId && bet.userId === userId);
        if (betIndex === -1) {
          return res.status(404).json({ message: "Bet not found" });
        }

        // Update bet status and calculate profit
        const bet = localBets[betIndex];
        bet.status = status;
        bet.updatedAt = new Date();
        
        const stakeNum = parseFloat(bet.stake);
        const payoutNum = parseFloat(bet.payout);
        
        if (status === 'completed') {
          bet.profit = (payoutNum - stakeNum).toString();
        } else if (status === 'lost') {
          bet.profit = (-stakeNum).toString();
        } else {
          bet.profit = '0';
        }
        
        saveLocalBets(localBets);
        console.log("Updated bet status:", bet);
        
        res.json({
          ...bet,
          placedAt: bet.placedAt.toISOString ? bet.placedAt.toISOString() : bet.placedAt,
          createdAt: bet.createdAt.toISOString ? bet.createdAt.toISOString() : bet.createdAt,
          updatedAt: bet.updatedAt.toISOString(),
        });
      }
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
      
      // Try database first, fallback to local storage
      try {
        await storage.deleteBet(betId, userId);
        console.log("Deleted database bet:", betId);
        res.json({ message: "Bet deleted successfully" });
        return;
      } catch (dbError) {
        console.warn("Database unavailable, using local storage:", dbError);
        // Fallback to local storage
        const betIndex = localBets.findIndex(bet => bet.id === betId && bet.userId === userId);
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

  // Update user profile photo
  app.patch("/api/profile/photo", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { profileImageUrl } = req.body;
      
      if (!profileImageUrl) {
        return res.status(400).json({ message: "Profile image URL is required" });
      }

      // Try database first
      try {
        const updatedUser = await storage.updateUserProfileImage(userId, profileImageUrl);
        console.log("Updated user profile photo:", updatedUser.id);
        res.json(updatedUser);
        return;
      } catch (dbError) {
        console.warn("Database unavailable for profile photo update:", dbError);
        res.status(500).json({ message: "Failed to update profile photo" });
      }
    } catch (error) {
      console.error("Error updating profile photo:", error);
      res.status(500).json({ message: "Failed to update profile photo" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}