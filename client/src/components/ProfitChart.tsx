import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { BetStats, BetFilters } from "@/lib/types";

interface ProfitChartProps {
  filters: BetFilters;
}

export default function ProfitChart({ filters }: ProfitChartProps) {
  const { data: stats, isLoading } = useQuery<BetStats>({
    queryKey: ["/api/bets/stats", filters],
  });

  const chartData = stats?.profitByDate?.map(item => ({
    date: item.date,
    profit: parseFloat(item.profit.toString()),
  })) || [];

  if (isLoading) {
    return (
      <Card className="p-6 border bg-card-oled border-oled">
        <div className="h-80 flex items-center justify-center animate-pulse">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-oled-muted" />
            <p className="text-oled-secondary">Carregando gráfico...</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border bg-card-oled border-oled">
      <CardContent className="p-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-oled-primary">
              Evolução de Lucros
            </h3>
            <p className="text-sm text-oled-secondary">
              {filters.period === 'daily' ? 'Último dia' : 'Últimos meses'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={filters.period === 'daily' ? 'default' : 'outline'}
              size="sm"
              className={`rounded-lg text-xs ${
                filters.period === 'daily' 
                  ? 'bg-accent-10 border-accent-20 text-primary' 
                  : 'border-oled bg-card-oled text-oled-secondary hover:text-oled-primary'
              }`}
            >
              Diário
            </Button>
            <Button 
              variant={filters.period === 'monthly' ? 'default' : 'outline'}
              size="sm"
              className={`rounded-lg text-xs ${
                filters.period === 'monthly' 
                  ? 'bg-accent-10 border-accent-20 text-primary' 
                  : 'border-oled bg-card-oled text-oled-secondary hover:text-oled-primary'
              }`}
            >
              Mensal
            </Button>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(190, 100%, 60%)" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="hsl(190, 100%, 60%)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeOpacity={0.1} vertical={false} stroke="hsl(0, 0%, 15%)" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'hsl(0, 0%, 65%)', fontSize: 12 }} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fill: 'hsl(0, 0%, 65%)', fontSize: 12 }} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(0, 0%, 2%)', 
                    border: '1px solid hsl(0, 0%, 15%)',
                    borderRadius: '8px',
                    color: 'hsl(0, 0%, 98%)'
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Lucro']}
                />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="hsl(190, 100%, 60%)" 
                  fill="url(#profitGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center border rounded-lg border-oled bg-oled/50">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-oled-muted" />
              <p className="text-sm text-oled-secondary">
                Nenhum dado encontrado para o período selecionado
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
