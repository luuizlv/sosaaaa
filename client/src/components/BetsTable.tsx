import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatCurrency, formatCurrencyWithSign, formatDate } from "@/lib/formatters";
import { BET_TYPES, type Bet, type BetFilters, type BetStatus } from "@/lib/types";
import { Trash2, Eye, Clock, CheckCircle, XCircle, Calendar } from "lucide-react";

interface BetsTableProps {
  filters: BetFilters;
}

const getBetTypeColor = (betType: string) => {
  const colors = {
    surebet: '#8B0000',        // Dark red wine
    giros: '#DC143C',          // Crimson
    superodd: '#B22222',       // Fire brick
    dnc: '#4B0082',            // Indigo
    gastos: '#800080',         // Purple
    bingos: '#DAA520',         // Goldenrod
    extracao: '#CD853F',       // Peru
  };
  return colors[betType as keyof typeof colors] || '#6B7280';
};

export default function BetsTable({ filters }: BetsTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bets, isLoading } = useQuery<Bet[]>({
    queryKey: ["/api/bets", filters],
  });

  const updateBetStatusMutation = useMutation({
    mutationFn: async ({ betId, status }: { betId: string; status: BetStatus }) => {
      return apiRequest('PATCH', `/api/bets/${betId}/status`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Status atualizado",
        description: "Status da aposta atualizado com sucesso!",
      });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === '/api/bets' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === '/api/bets/stats' });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi desconectado. Redirecionando...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao atualizar status. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteBetMutation = useMutation({
    mutationFn: async (betId: string) => {
      return apiRequest('DELETE', `/api/bets/${betId}`);
    },
    onSuccess: () => {
      toast({
        title: "Aposta removida",
        description: "Aposta deletada com sucesso!",
      });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === '/api/bets' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === '/api/bets/stats' });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você foi desconectado. Redirecionando...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao deletar aposta. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (betId: string) => {
    if (confirm('Tem certeza que deseja deletar esta aposta?')) {
      deleteBetMutation.mutate(betId);
    }
  };

  const handleStatusChange = (betId: string, currentStatus: BetStatus) => {
    let newStatus: BetStatus;
    if (currentStatus === 'pending') {
      newStatus = 'completed';
    } else if (currentStatus === 'completed') {
      newStatus = 'lost';
    } else {
      newStatus = 'pending';
    }
    console.log(`Changing bet ${betId} from ${currentStatus} to ${newStatus}`);
    updateBetStatusMutation.mutate({ betId, status: newStatus });
  };

  const getStatusIcon = (status: BetStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gold" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'lost':
        return <XCircle className="h-4 w-4 text-red-400" />;
    }
  };

  const getStatusText = (status: BetStatus) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'completed':
        return 'Finalizada';
      case 'lost':
        return 'Perdida';
    }
  };

  const getStatusColor = (status: BetStatus) => {
    switch (status) {
      case 'pending':
        return 'text-gold bg-gold/10 border-gold/30';
      case 'completed':
        return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'lost':
        return 'text-red-400 bg-red-400/10 border-red-400/30';
    }
  };

  // Helper function to safely format dates for grouping
  const formatDateSafely = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        const today = new Date();
        return today.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      }
      // Use toLocaleDateString with Brazil timezone for consistent date formatting
      return date.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    } catch (error) {
      console.warn('Date parsing error:', error, dateString);
      const today = new Date();
      return today.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    }
  };

  const formatTimeSafely = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date for time:', dateString);
        return '--:--';
      }
      return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
      });
    } catch (error) {
      console.warn('Time parsing error:', error, dateString);
      return '--:--';
    }
  };

  const formatDateForDisplay = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '--/--/----';
      }
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo'
      });
    } catch (error) {
      return '--/--/----';
    }
  };

  // Separate recent bets (last 48h) from older bets
  const separateBetsByRecency = (betList: Bet[]) => {
    const nowInBrazil = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
    const now = new Date(nowInBrazil);
    const last48Hours = new Date(now.getTime() - (48 * 60 * 60 * 1000)); // 48 horas atrás
    
    const todaysBets: Bet[] = [];
    const olderBets: Bet[] = [];
    
    betList.forEach(bet => {
      const betDate = new Date(bet.placedAt);
      if (betDate >= last48Hours) {
        todaysBets.push(bet);
      } else {
        olderBets.push(bet);
      }
    });
    
    return { todaysBets, olderBets };
  };

  // Group older bets by date for monthly view
  const groupBetsByDate = (betList: Bet[]) => {
    const groups: { [key: string]: Bet[] } = {};
    
    betList.forEach(bet => {
      const betDate = formatDateSafely(bet.placedAt);
      if (!groups[betDate]) {
        groups[betDate] = [];
      }
      groups[betDate].push(bet);
    });
    
    return groups;
  };

  const renderRecentBetsTable = (bets: Bet[]) => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-oled-gray/50">
          <tr>
            <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase">
              Horário
            </th>
            <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase">
              Tipo
            </th>
            <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase">
              Status
            </th>
            <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase">
              Casa
            </th>
            <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase">
              Descrição
            </th>
            <th className="text-right px-6 py-3 text-xs font-medium text-zinc-500 uppercase">
              Stake
            </th>
            <th className="text-right px-6 py-3 text-xs font-medium text-zinc-500 uppercase">
              Payout
            </th>
            <th className="text-right px-6 py-3 text-xs font-medium text-zinc-500 uppercase">
              Lucro
            </th>
            <th className="text-center px-6 py-3 text-xs font-medium text-zinc-500 uppercase">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-700/50">
          {bets.map((bet) => {
            const profit = parseFloat(bet.profit);
            const betDate = formatDateForDisplay(bet.placedAt);

            return (
              <tr key={bet.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-sm text-oled-secondary">
                  {betDate}
                </td>
                <td className="px-6 py-4">
                  <Badge 
                    className="rounded-full text-xs font-medium px-2 py-1"
                    style={{
                      backgroundColor: `${getBetTypeColor(bet.betType)}20`,
                      color: getBetTypeColor(bet.betType),
                      border: `1px solid ${getBetTypeColor(bet.betType)}40`
                    }}
                  >
                    {BET_TYPES[bet.betType as keyof typeof BET_TYPES]}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleStatusChange(bet.id, bet.status)}
                    disabled={updateBetStatusMutation.isPending}
                    className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold border transition-all duration-200 hover:scale-105 ${getStatusColor(bet.status)} ${bet.status === 'pending' ? 'hover:bg-gold/20' : ''}`}
                  >
                    {getStatusIcon(bet.status)}
                    {getStatusText(bet.status)}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-oled-secondary">
                  {bet.house || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-oled-secondary">
                  {bet.description || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-right text-oled-secondary">
                  {formatCurrency(bet.stake)}
                </td>
                <td className="px-6 py-4 text-sm text-right text-oled-secondary">
                  {formatCurrency(bet.payout)}
                </td>
                <td className={`px-6 py-4 text-sm text-right font-semibold ${bet.status === 'completed' ? (profit >= 0 ? 'text-pos' : 'text-neg') : 'text-zinc-500'}`}>
                  {bet.status === 'completed' ? formatCurrencyWithSign(profit) : 
                   bet.status === 'lost' ? formatCurrencyWithSign(-parseFloat(bet.stake)) : 
                   '-'}
                </td>
                <td className="px-6 py-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(bet.id)}
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderMonthlyBetsTable = (bets: Bet[]) => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-oled-gray/50">
          <tr>
            <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase">
              Data
            </th>
            <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase">
              Tipo
            </th>
            <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase">
              Status
            </th>
            <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase">
              Casa
            </th>
            <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase">
              Descrição
            </th>
            <th className="text-right px-6 py-3 text-xs font-medium text-zinc-500 uppercase">
              Stake
            </th>
            <th className="text-right px-6 py-3 text-xs font-medium text-zinc-500 uppercase">
              Payout
            </th>
            <th className="text-right px-6 py-3 text-xs font-medium text-zinc-500 uppercase">
              Lucro
            </th>
            <th className="text-center px-6 py-3 text-xs font-medium text-zinc-500 uppercase">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-700/50">
          {bets.map((bet) => {
            const profit = parseFloat(bet.profit);
            const betDate = formatTimeSafely(bet.placedAt);

            return (
              <tr key={bet.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 text-sm text-oled-secondary">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-wine-light" />
                    {betDate}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge 
                    className="rounded-full text-xs font-medium px-2 py-1"
                    style={{
                      backgroundColor: `${getBetTypeColor(bet.betType)}20`,
                      color: getBetTypeColor(bet.betType),
                      border: `1px solid ${getBetTypeColor(bet.betType)}40`
                    }}
                  >
                    {BET_TYPES[bet.betType as keyof typeof BET_TYPES]}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(bet.status)}`}>
                    {getStatusIcon(bet.status)}
                    {getStatusText(bet.status)}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-oled-secondary">
                  {bet.house || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-oled-secondary">
                  {bet.description || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-right text-oled-secondary">
                  {formatCurrency(bet.stake)}
                </td>
                <td className="px-6 py-4 text-sm text-right text-oled-secondary">
                  {formatCurrency(bet.payout)}
                </td>
                <td className={`px-6 py-4 text-sm text-right font-semibold ${bet.status === 'completed' ? (profit >= 0 ? 'text-pos' : 'text-neg') : 'text-zinc-500'}`}>
                  {bet.status === 'completed' ? formatCurrencyWithSign(profit) : 
                   bet.status === 'lost' ? formatCurrencyWithSign(-parseFloat(bet.stake)) : 
                   '-'}
                </td>
                <td className="px-6 py-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(bet.id)}
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (isLoading) {
    return (
      <Card className="border overflow-hidden bg-card-oled border-oled">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-oled-gray rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const allBets = bets || [];
  
  // Check if we're in monthly view with a specific month selected
  const isMonthlyView = filters.period === 'monthly' && filters.month;
  
  if (isMonthlyView) {
    // Monthly view: Show "Apostas Feitas" with dates
    const groupedByDate = groupBetsByDate(allBets);
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));
    
    const monthlyTotal = allBets
      .filter(bet => bet.status === 'completed' || bet.status === 'lost')
      .reduce((total, bet) => {
        const profit = bet.status === 'completed' 
          ? parseFloat(bet.profit) 
          : -parseFloat(bet.stake);
        return total + profit;
      }, 0);

    const selectedMonth = filters.month!;
    const [year, monthNum] = selectedMonth.split('-');
    const monthName = new Intl.DateTimeFormat('pt-BR', { 
      month: 'long', 
      year: 'numeric' 
    }).format(new Date(parseInt(year), parseInt(monthNum) - 1));

    return (
      <Card className="border overflow-hidden bg-card-oled border-oled">
        <div className="p-6 border-b border-oled">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gold">
                Apostas Feitas
              </h3>
              <p className="text-sm text-oled-secondary">
                {allBets.length} apostas em {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
              </p>
            </div>
            <div className={`text-sm font-semibold px-4 py-2 rounded-lg border ${
              monthlyTotal >= 0 
                ? 'text-gold bg-gold/10 border-gold/30' 
                : 'text-red-400 bg-red-400/10 border-red-400/30'
            }`}>
              Saldo: {formatCurrencyWithSign(monthlyTotal)}
            </div>
          </div>
        </div>

        {allBets.length > 0 ? (
          <div className="space-y-4">
            {sortedDates.map((date) => {
              const dateBets = groupedByDate[date];
              const dailyTotal = dateBets
                .filter(bet => bet.status === 'completed' || bet.status === 'lost')
                .reduce((total, bet) => {
                  const profit = bet.status === 'completed' 
                    ? parseFloat(bet.profit) 
                    : -parseFloat(bet.stake);
                  return total + profit;
                }, 0);

              const dateLabel = (() => {
                try {
                  const dateObj = new Date(date + 'T12:00:00'); // Adiciona meio-dia para evitar problemas de timezone
                  if (isNaN(dateObj.getTime())) return formatDateForDisplay(date);
                  
                  const today = new Date();
                  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
                  
                  // Normalizar datas para comparação (apenas dia/mês/ano)
                  const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
                  const normalizedBetDate = normalizeDate(dateObj);
                  const normalizedToday = normalizeDate(today);
                  const normalizedYesterday = normalizeDate(yesterday);
                  
                  if (normalizedBetDate.getTime() === normalizedToday.getTime()) {
                    return 'Hoje';
                  } else if (normalizedBetDate.getTime() === normalizedYesterday.getTime()) {
                    return 'Ontem';
                  } else {
                    return dateObj.toLocaleDateString('pt-BR', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long',
                      timeZone: 'America/Sao_Paulo'
                    });
                  }
                } catch (error) {
                  console.warn('Date label error:', error, date);
                  return formatDateForDisplay(date);
                }
              })();

              return (
                <div key={date} className="border border-oled rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-oled flex justify-between items-center bg-wine/10">
                    <div>
                      <h4 className="font-semibold text-wine-light">
                        {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
                      </h4>
                      <p className="text-sm text-oled-secondary">
                        {dateBets.length} apostas
                      </p>
                    </div>
                    <div className={`text-sm font-semibold ${
                      dailyTotal >= 0 ? 'text-gold' : 'text-red-400'
                    }`}>
                      {formatCurrencyWithSign(dailyTotal)}
                    </div>
                  </div>
                  {renderMonthlyBetsTable(dateBets)}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center text-oled-secondary">
            Nenhuma aposta encontrada para este mês
          </div>
        )}
      </Card>
    );
  } else {
    // Daily view: Show only today's bets as "Apostas Recentes"
    const { todaysBets } = separateBetsByRecency(allBets);
    
    return (
      <Card className="border overflow-hidden bg-card-oled border-oled">
        <div className="p-6 border-b border-oled">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gold">
                Apostas Recentes
              </h3>
              <p className="text-sm text-oled-secondary">
                {todaysBets.length > 0 ? 'nas últimas 48h' : 'Nenhuma aposta nas últimas 48h'}
              </p>
            </div>
            <Button variant="ghost" className="text-sm font-medium text-gold hover:text-gold-light">
              <Eye className="h-4 w-4 mr-2" />
              Ver todas
            </Button>
          </div>
        </div>

        {todaysBets.length > 0 ? (
          <div className="border border-oled rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-oled flex justify-between items-center bg-gradient-to-r from-gold/10 to-wine/10 border-wine/20">
              <div>
                <h4 className="font-semibold text-gold">
                  Últimas 48 Horas
                </h4>
                <p className="text-sm text-oled-secondary">
                  {todaysBets.length} apostas recentes
                </p>
              </div>
              <div className={`text-sm font-semibold ${
                (() => {
                  const dailyTotal = todaysBets
                    .filter(bet => bet.status === 'completed' || bet.status === 'lost')
                    .reduce((total, bet) => {
                      const profit = bet.status === 'completed' 
                        ? parseFloat(bet.profit) 
                        : -parseFloat(bet.stake);
                      return total + profit;
                    }, 0);
                  return dailyTotal >= 0 ? 'text-gold' : 'text-red-400';
                })()
              }`}>
                Saldo do dia: {formatCurrencyWithSign(
                  todaysBets
                    .filter(bet => bet.status === 'completed' || bet.status === 'lost')
                    .reduce((total, bet) => {
                      const profit = bet.status === 'completed' 
                        ? parseFloat(bet.profit) 
                        : -parseFloat(bet.stake);
                      return total + profit;
                    }, 0)
                )}
              </div>
            </div>
            {renderRecentBetsTable(todaysBets)}
          </div>
        ) : (
          <div className="p-6 text-center text-oled-secondary">
            Nenhuma aposta registrada nas últimas 48 horas
          </div>
        )}
      </Card>
    );
  }
}