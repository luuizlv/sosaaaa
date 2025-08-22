import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Calendar, Target } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { BetStats, BetFilters } from "@/lib/types";

interface ProfitProjectionChartProps {
  filters: BetFilters;
}

type ProjectionMode = 'mensal' | 'semestral' | 'anual';

export default function ProfitProjectionChart({ filters }: ProfitProjectionChartProps) {
  const [projectionMode, setProjectionMode] = useState<ProjectionMode>('mensal');
  
  const { data: stats, isLoading } = useQuery<BetStats>({
    queryKey: ["/api/bets/stats", filters],
  });

  // Get historical data for projections (last 30 days)
  const { data: historicalStats } = useQuery<BetStats>({
    queryKey: ["/api/bets/stats", { ...filters, period: 'monthly' }],
  });

  // Calculate daily average profit from historical data
  const calculateDailyAverage = () => {
    const dataSource = historicalStats || stats;
    if (!dataSource?.profitByDate || dataSource.profitByDate.length === 0) {
      return 0;
    }

    const totalProfit = dataSource.profitByDate.reduce((sum, day) => sum + day.profit, 0);
    const totalDays = dataSource.profitByDate.length;
    return totalProfit / totalDays;
  };

  const dailyAverage = calculateDailyAverage();

  // Calculate projections for chart showing daily evolution
  const getProjectionData = () => {
    const today = new Date();
    const data = [];
    
    if (projectionMode === 'mensal') {
      // Show daily progression for 30 days
      for (let i = 1; i <= 30; i++) {
        data.push({
          period: `Dia ${i}`,
          accumulated: dailyAverage * i,
          daily: dailyAverage
        });
      }
    } else if (projectionMode === 'semestral') {
      // Show monthly progression for 6 months
      for (let i = 1; i <= 6; i++) {
        const monthlyTotal = dailyAverage * 30;
        data.push({
          period: `Mês ${i}`,
          accumulated: monthlyTotal * i,
          daily: monthlyTotal
        });
      }
    } else if (projectionMode === 'anual') {
      // Show monthly progression for 12 months
      for (let i = 1; i <= 12; i++) {
        const monthlyTotal = dailyAverage * 30;
        data.push({
          period: `Mês ${i}`,
          accumulated: monthlyTotal * i,
          daily: monthlyTotal
        });
      }
    }
    
    return data;
  };

  const chartData = getProjectionData();
  
  const getCurrentProjection = () => {
    if (projectionMode === 'mensal') {
      return { period: 'Mensal', days: 30, value: dailyAverage * 30 };
    } else if (projectionMode === 'semestral') {
      return { period: 'Semestral', days: 180, value: dailyAverage * 180 };
    } else {
      return { period: 'Anual', days: 365, value: dailyAverage * 365 };
    }
  };

  const currentProjection = getCurrentProjection();

  if (isLoading) {
    return (
      <Card className="p-6 border bg-zinc-900 border-zinc-700">
        <div className="h-80 flex items-center justify-center animate-pulse">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-zinc-500" />
            <p className="text-zinc-400">Carregando projeções...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border-zinc-700/50 shadow-xl shadow-zinc-900/20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-green-500/10 to-transparent rounded-full blur-2xl"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-xl"></div>
      
      <CardContent className="p-0 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
              <Target className="h-5 w-5 text-green-400" />
              Projeção de Lucros
            </h3>
            <p className="text-sm text-zinc-400">
              Baseado na média diária de {formatCurrency(Math.abs(dailyAverage))} {dailyAverage >= 0 ? 'lucro' : 'prejuízo'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={projectionMode === 'mensal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setProjectionMode('mensal')}
              className={`rounded-lg text-xs transition-all ${
                projectionMode === 'mensal' 
                  ? 'bg-green-500/20 border-green-500/50 text-green-400 shadow-lg shadow-green-500/25' 
                  : 'border-zinc-600/50 bg-zinc-800/50 text-zinc-400 hover:text-green-400 hover:border-green-500/30'
              }`}
            >
              Mensal
            </Button>
            <Button 
              variant={projectionMode === 'semestral' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setProjectionMode('semestral')}
              className={`rounded-lg text-xs transition-all ${
                projectionMode === 'semestral' 
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-lg shadow-blue-500/25' 
                  : 'border-zinc-600/50 bg-zinc-800/50 text-zinc-400 hover:text-blue-400 hover:border-blue-500/30'
              }`}
            >
              Semestral
            </Button>
            <Button 
              variant={projectionMode === 'anual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setProjectionMode('anual')}
              className={`rounded-lg text-xs transition-all ${
                projectionMode === 'anual' 
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-400 shadow-lg shadow-purple-500/25' 
                  : 'border-zinc-600/50 bg-zinc-800/50 text-zinc-400 hover:text-purple-400 hover:border-purple-500/30'
              }`}
            >
              Anual
            </Button>
          </div>
        </div>

        {dailyAverage !== 0 ? (
          <>
            {/* Current Projection Highlight */}
            <div className={`mb-6 p-6 rounded-xl border-2 bg-gradient-to-r ${
              currentProjection.value >= 0 
                ? 'from-green-500/10 to-emerald-500/5 border-green-500/30' 
                : 'from-red-500/10 to-rose-500/5 border-red-500/30'
            }`}>
              <div className="text-center">
                <div className="text-sm text-zinc-400 mb-2">Projeção {currentProjection.period}</div>
                <div className={`text-3xl font-bold mb-1 ${
                  currentProjection.value >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {formatCurrency(Math.abs(currentProjection.value))}
                </div>
                <div className="text-sm text-zinc-500">
                  {currentProjection.days} dias • {projectionMode === 'mensal' ? 'Evolução diária' : projectionMode === 'anual' ? 'Evolução mensal' : 'Evolução mensal'}
                </div>
              </div>
            </div>

            {/* Evolution Chart */}
            <div className="h-72 mb-6 p-4 rounded-xl bg-zinc-900/50 border border-zinc-700/50">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={
                        projectionMode === 'mensal' ? '#10B981' : projectionMode === 'semestral' ? '#3B82F6' : '#A855F7'
                      } stopOpacity={0.3} />
                      <stop offset="95%" stopColor={
                        projectionMode === 'mensal' ? '#10B981' : projectionMode === 'semestral' ? '#3B82F6' : '#A855F7'
                      } stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeOpacity={0.1} vertical={false} stroke="hsl(0, 0%, 25%)" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fill: 'hsl(0, 0%, 65%)', fontSize: 11 }} 
                    tickLine={false} 
                    axisLine={false}
                    interval={projectionMode === 'mensal' ? 4 : 0}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(0, 0%, 65%)', fontSize: 11 }} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => formatCurrency(Math.abs(value))}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(0, 0%, 4%)', 
                      border: '1px solid hsl(0, 0%, 25%)',
                      borderRadius: '12px',
                      color: 'hsl(0, 0%, 98%)',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                    }}
                    formatter={(value: number, name, props) => {
                      if (name === 'accumulated') {
                        return [`${formatCurrency(Math.abs(value))} ${value >= 0 ? 'lucro' : 'prejuízo'}`, 'Total Acumulado'];
                      }
                      return [`${formatCurrency(Math.abs(value))} ${value >= 0 ? 'lucro' : 'prejuízo'}`, projectionMode === 'mensal' ? 'Lucro Diário' : 'Lucro Mensal'];
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="accumulated" 
                    stroke={
                      projectionMode === 'mensal' ? '#10B981' : projectionMode === 'semestral' ? '#3B82F6' : '#A855F7'
                    }
                    fill="url(#profitGradient)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

          </>
        ) : (
          <div className="h-64 flex items-center justify-center border rounded-xl border-zinc-700/50 bg-zinc-800/30">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-zinc-600/20 to-zinc-700/20 rounded-full flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-zinc-500" />
              </div>
              <p className="text-sm text-zinc-400 mb-2">
                Sem dados suficientes para projeções
              </p>
              <p className="text-xs text-zinc-500">
                Adicione apostas finalizadas para ver as projeções de lucro
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}