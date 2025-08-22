import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, DollarSign, Activity, Calendar } from "lucide-react";
import { formatCurrencyWithSign, formatCurrency, formatPercentageWithSign } from "@/lib/formatters";
import type { BetStats, BetFilters } from "@/lib/types";

interface StatsCardsProps {
  filters: BetFilters;
}

export default function StatsCards({ filters }: StatsCardsProps) {
  const { data: stats, isLoading } = useQuery<BetStats>({
    queryKey: ["/api/bets/stats", filters],
  });


  if (isLoading) {
    return (
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6 border animate-pulse bg-zinc-900 border-zinc-700">
            <div className="h-24 bg-zinc-800 rounded"></div>
          </Card>
        ))}
      </section>
    );
  }

  const profit = stats?.totalProfit || 0;
  const roi = stats?.roi || 0;
  const isPositive = profit >= 0;
  

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Profit/Loss Card */}
      <Card className="p-6 border hover:border-opacity-50 transition-colors bg-zinc-900 border-zinc-700 hover-lift animate-bounceIn animate-delay-100">
        <CardContent className="p-0">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-zinc-400">
              {filters.month ? (
                (() => {
                  const [year, month] = filters.month.split('-');
                  const monthName = new Intl.DateTimeFormat('pt-BR', { 
                    month: 'long', 
                    year: 'numeric' 
                  }).format(new Date(parseInt(year), parseInt(month) - 1, 1));
                  return `Lucro / Perda - ${monthName.charAt(0).toUpperCase()}${monthName.slice(1)}`;
                })()
              ) : (
                `Lucro / Perda ${filters.period === 'daily' ? 'Diário' : filters.period === 'monthly' ? 'Mensal' : 'Anual'}`
              )}
            </div>
            <TrendingUp className={`h-5 w-5 ${isPositive ? 'text-green-400' : 'text-red-400'}`} />
          </div>
          <div className={`text-3xl font-bold mb-2 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrencyWithSign(profit)}
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">ROI:</span>
              <span className={`font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {formatPercentageWithSign(roi)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Bets Card */}
      <Card className="p-6 border hover:border-opacity-50 transition-colors bg-zinc-900 border-zinc-700 hover-lift animate-bounceIn animate-delay-200">
        <CardContent className="p-0">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-zinc-400">
              Total de Apostas
            </div>
            <Activity className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="text-3xl font-bold mb-2 text-zinc-200">
            {stats?.totalBets || 0}
          </div>
          <div className="text-sm text-zinc-400">
            Apostas registradas no período
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary Card */}
      <Card className="p-6 border hover:border-opacity-50 transition-colors md:col-span-2 xl:col-span-1 bg-zinc-900 border-zinc-700 hover-lift animate-bounceIn animate-delay-300">
        <CardContent className="p-0">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-zinc-400">
              Resumo Financeiro
            </div>
            <DollarSign className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">
                Stake Total:
              </span>
              <span className="font-semibold text-zinc-200">
                {formatCurrency(stats?.totalStake || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">
                Payout Total:
              </span>
              <span className="font-semibold text-green-400">
                {formatCurrency(stats?.totalPayout || 0)}
              </span>
            </div>
            <div className="h-px bg-zinc-700"></div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">
                Lucro Líquido:
              </span>
              <span className={`font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(profit)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
