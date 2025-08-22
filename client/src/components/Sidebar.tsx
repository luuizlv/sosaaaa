import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart3, Home, Plus, History, TrendingUp } from "lucide-react";
import { type BetFilters } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  filters: BetFilters;
  onFiltersChange: (filters: BetFilters) => void;
}

export default function Sidebar({ open, onClose, filters, onFiltersChange }: SidebarProps) {
  const [localFilters, setLocalFilters] = useState<BetFilters>(filters);
  
  // Get available months from bets
  const { data: availableMonths } = useQuery<string[]>({
    queryKey: ["/api/bets/months"],
  });

  // Get available years from bets
  const { data: availableYears } = useQuery<string[]>({
    queryKey: ["/api/bets/years"],
  });

  const handleFilterChange = (key: keyof BetFilters, value: string) => {
    const newFilters = { ...localFilters, [key]: value || undefined };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };


  const clearFilters = () => {
    const clearedFilters = { period: 'daily' as const };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };
  
  // Clear month/year filter when period changes
  const handlePeriodChange = (period: string) => {
    const newFilters = { ...localFilters, period: period as any, month: undefined, year: undefined };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <aside className={cn(
      "fixed inset-y-16 left-0 z-40 w-72 transform border-r backdrop-blur-sm transition-transform -translate-x-full lg:translate-x-0 lg:static lg:inset-0",
      open && "translate-x-0"
    )} style={{
      backgroundColor: 'rgb(0, 0, 0, 0.95)',
      borderColor: 'rgb(39, 39, 42)'
    }}>
      <div className="p-6 h-full overflow-y-auto">
        {/* Navigation */}
        <nav className="space-y-2 mb-8">
          <div className="text-xs font-semibold uppercase tracking-wider mb-4 text-amber-500">
            Navegação
          </div>
          
          <Button
            variant="ghost" 
            className="w-full justify-start gap-3 rounded-xl py-3 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 text-amber-400 hover:from-amber-500/30 hover:to-yellow-500/30"
          >
            <BarChart3 className="h-5 w-5" />
            Dashboard
          </Button>
        </nav>

        {/* Filters */}
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Filtros
          </div>

          {/* Period Filter */}
          <div>
            <Label className="text-sm mb-2 block text-oled-secondary">
              Período
            </Label>
            <div className="flex flex-wrap gap-2">
              {(['daily', 'monthly', 'yearly'] as const).map(period => (
                <Button
                  key={period}
                  variant="outline"
                  size="sm"
                  className={cn("rounded-lg text-sm border", {
                    "border-yellow-400 bg-yellow-500/10 text-yellow-400": localFilters.period === period,
                    "border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-yellow-400": localFilters.period !== period,
                  })}
                  onClick={() => handlePeriodChange(period)}
                >
                  {period === 'daily' ? 'Diário' : period === 'monthly' ? 'Mensal' : 'Anual'}
                </Button>
              ))}
            </div>
          </div>

          {/* Month Filter - only show when monthly period is selected */}
          {localFilters.period === 'monthly' && (
            <div>
              <Label className="text-sm mb-2 block text-zinc-300">
                Mês
              </Label>
              <Select value={localFilters.month || ""} onValueChange={(value) => handleFilterChange('month', value)}>
                <SelectTrigger className="rounded-lg bg-zinc-900 border-zinc-700 text-zinc-200 focus:border-yellow-400">
                  <SelectValue placeholder="Selecione um mês" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {availableMonths?.map(month => {
                    const [year, monthNum] = month.split('-');
                    const monthName = new Intl.DateTimeFormat('pt-BR', { 
                      month: 'long', 
                      year: 'numeric' 
                    }).format(new Date(parseInt(year), parseInt(monthNum) - 1));
                    return (
                      <SelectItem key={month} value={month}>
                        {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Year Filter - only show when yearly period is selected */}
          {localFilters.period === 'yearly' && (
            <div>
              <Label className="text-sm mb-2 block text-zinc-300">
                Ano
              </Label>
              <Select value={localFilters.year || "all"} onValueChange={(value) => handleFilterChange('year', value === "all" ? "" : value)}>
                <SelectTrigger className="rounded-lg bg-zinc-900 border-zinc-700 text-zinc-200 focus:border-yellow-400">
                  <SelectValue placeholder="Todos os anos" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="all">Todos os anos</SelectItem>
                  {availableYears?.map(year => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}



          <div className="mt-6">
            <Button
              variant="outline"
              onClick={clearFilters}
              className="w-full rounded-lg border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-yellow-400 hover:bg-zinc-800"
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
