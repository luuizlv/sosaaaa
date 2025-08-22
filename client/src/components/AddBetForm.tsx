import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatCurrencyWithSign, getTodayInBrazil } from "@/lib/formatters";
import { BET_TYPES, BETTING_HOUSES, type BetTypeKey } from "@/lib/types";
import { useFavoriteHouses } from "@/hooks/useFavoriteHouses";
import { PlusCircle, Save, X, Star } from "lucide-react";

interface BetFormData {
  stake: string;
  payout: string;
  betType: BetTypeKey | '';
  house: string;
  description: string;
  placedAt: string;
}

export default function AddBetForm() {
  const [formData, setFormData] = useState<BetFormData>({
    stake: '',
    payout: '',
    betType: '',
    house: '',
    description: '',
    placedAt: getTodayInBrazil(),
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { favoriteHouses, houseUsage, trackHouseUsage, getTopSuggestions } = useFavoriteHouses();

  const createBetMutation = useMutation({
    mutationFn: async (data: BetFormData) => {
      return apiRequest('POST', '/api/bets', {
        stake: data.stake,
        payout: data.payout,
        betType: data.betType,
        house: data.house || null,
        description: data.description || null,
        placedAt: data.placedAt,
      });
    },
    onSuccess: () => {
      // Track house usage for favorites
      if (formData.house) {
        trackHouseUsage(formData.house);
      }
      
      toast({
        title: "Aposta criada",
        description: "Aposta adicionada com sucesso!",
      });
      // Clear form
      setFormData({
        stake: '',
        payout: '',
        betType: '',
        house: '',
        description: '',
        placedAt: getTodayInBrazil(),
      });
      // Invalidate all bet-related queries to refresh data
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
      const errorMessage = error?.message || "Falha ao criar aposta. Tente novamente.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.stake || !formData.betType) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha stake e tipo de aposta.",
        variant: "destructive",
      });
      return;
    }

    createBetMutation.mutate(formData);
  };

  const handleClear = () => {
    setFormData({
      stake: '',
      payout: '',
      betType: '',
      house: '',
      description: '',
      placedAt: getTodayInBrazil(),
    });
  };

  const calculateProfit = () => {
    const stake = parseFloat(formData.stake || '0');
    const payout = parseFloat(formData.payout || '0');
    if (!formData.payout || formData.payout === '') {
      return -stake; // Show as loss if payout not specified
    }
    return payout - stake;
  };

  const profit = calculateProfit();

  return (
    <Card className="p-6 border bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border-amber-500/20 shadow-xl shadow-amber-500/10 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-2xl"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-yellow-500/10 to-transparent rounded-full blur-xl"></div>
      
      <CardContent className="p-0 relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
            <PlusCircle className="h-5 w-5 text-black" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-amber-400">
              Nova Aposta
            </h3>
            <p className="text-xs text-zinc-400 -mt-1">Registre sua próxima jogada</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Stake */}
          <div>
            <Label className="text-sm mb-2 block text-amber-200 font-medium">
              Valor Apostado (Stake) *
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-amber-400 font-bold">
                R$
              </span>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.stake}
                onChange={(e) => setFormData(prev => ({ ...prev, stake: e.target.value }))}
                className="pl-10 rounded-xl bg-zinc-900/50 border-zinc-700/50 text-zinc-200 placeholder:text-zinc-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-300 h-12"
                required
              />
            </div>
          </div>

          {/* Payout */}
          <div>
            <Label className="text-sm mb-2 block text-amber-200 font-medium">
              Valor Recebido (Payout)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-amber-400 font-bold">
                R$
              </span>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.payout}
                onChange={(e) => setFormData(prev => ({ ...prev, payout: e.target.value }))}
                className="pl-10 rounded-xl bg-zinc-900/50 border-zinc-700/50 text-zinc-200 placeholder:text-zinc-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-300 h-12"
              />
            </div>
          </div>

          {/* Bet Type */}
          <div>
            <Label className="text-sm mb-3 block text-amber-200 font-medium">
              Tipo de Aposta * <span className="text-xs text-amber-400 ml-2">Clique para selecionar rapidamente</span>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(BET_TYPES).map(([key, type]) => (
                <Button
                  key={key}
                  type="button"
                  variant={formData.betType === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, betType: key as BetTypeKey }))}
                  className={`h-11 text-xs font-medium transition-all duration-200 ${
                    formData.betType === key
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-400 shadow-lg shadow-amber-500/25 transform scale-105'
                      : 'border-zinc-700/50 bg-zinc-800/50 text-zinc-400 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 hover:scale-102'
                  }`}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {/* House */}
          <div>
            <Label className="text-sm mb-2 block text-amber-200 font-medium">
              Casa de Apostas
              {favoriteHouses.length > 0 && (
                <span className="text-xs text-amber-400 ml-2">⭐ Favoritas no topo</span>
              )}
            </Label>
            <Select value={formData.house} onValueChange={(value: string) => setFormData(prev => ({ ...prev, house: value }))}>
              <SelectTrigger className="rounded-xl bg-zinc-900/50 border-zinc-700/50 text-zinc-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-300 h-12">
                <SelectValue placeholder="🎯 Escolha sua casa de apostas" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700 max-h-80 overflow-y-auto">
                {/* Quick favorites section */}
                {favoriteHouses.length > 0 && (
                  <>
                    <div className="px-3 py-2 text-xs text-amber-400 font-semibold bg-amber-500/10 border-b border-amber-500/20">
                      ⭐ SUAS FAVORITAS
                    </div>
                    {favoriteHouses.map((house) => (
                      <SelectItem key={`fav-${house}`} value={house}>
                        <div className="flex items-center gap-3 py-1">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          <span className="font-medium">{house}</span>
                          <div className="ml-auto text-xs text-amber-400">
                            {houseUsage[house] || 0}x usada
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                    <div className="border-b border-zinc-600 mx-2 my-2"></div>
                  </>
                )}
                
                {/* Top suggestions based on usage */}
                {getTopSuggestions().filter(house => !favoriteHouses.includes(house)).length > 0 && (
                  <>
                    <div className="px-3 py-2 text-xs text-green-400 font-semibold bg-green-500/10 border-b border-green-500/20">
                      🔥 MAIS USADAS
                    </div>
                    {getTopSuggestions().filter(house => !favoriteHouses.includes(house)).map((house) => (
                      <SelectItem key={`top-${house}`} value={house}>
                        <div className="flex items-center gap-3 py-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="font-medium">{house}</span>
                          <div className="ml-auto text-xs text-green-400">
                            {houseUsage[house]}x usada
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                    <div className="border-b border-zinc-600 mx-2 my-2"></div>
                  </>
                )}
                
                {/* Popular houses section */}
                <div className="px-3 py-2 text-xs text-blue-400 font-semibold bg-blue-500/10 border-b border-blue-500/20">
                  💎 CASAS POPULARES
                </div>
                {['Bet365', 'Betano', 'Stake', 'KTO', 'Betfair', 'Esportes da Sorte'].filter(house => 
                  !favoriteHouses.includes(house) && !getTopSuggestions().includes(house)
                ).map((house) => (
                  <SelectItem key={`popular-${house}`} value={house}>
                    <div className="flex items-center gap-3 py-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="font-medium">{house}</span>
                    </div>
                  </SelectItem>
                ))}
                <div className="border-b border-zinc-600 mx-2 my-2"></div>
                
                {/* All other houses */}
                <div className="px-3 py-2 text-xs text-zinc-400 font-semibold bg-zinc-800/50">
                  📝 TODAS AS CASAS
                </div>
                {BETTING_HOUSES.filter(house => 
                  !favoriteHouses.includes(house) && 
                  !getTopSuggestions().includes(house) &&
                  !['Bet365', 'Betano', 'Stake', 'KTO', 'Betfair', 'Esportes da Sorte'].includes(house)
                ).sort().map((house) => (
                  <SelectItem key={house} value={house}>
                    <div className="flex items-center gap-3 py-1">
                      <div className="w-2 h-2 bg-zinc-500 rounded-full"></div>
                      <span>{house}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm mb-2 block text-amber-200 font-medium">
              Descrição (Opcional)
            </Label>
            <Input
              placeholder="Ex: Arsenal vs Chelsea - Over 2.5 gols"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="rounded-xl bg-zinc-900/50 border-zinc-700/50 text-zinc-200 placeholder:text-zinc-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-300 h-12"
            />
          </div>

          {/* Date */}
          <div>
            <Label className="text-sm mb-2 block text-amber-200 font-medium">
              Data da Aposta
            </Label>
            <Input
              type="date"
              value={formData.placedAt}
              onChange={(e) => setFormData(prev => ({ ...prev, placedAt: e.target.value }))}
              className="rounded-xl bg-zinc-900/50 border-zinc-700/50 text-zinc-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-300 h-12"
            />
          </div>

          {/* Profit Display */}
          <div>
            <Label className="text-sm mb-2 block text-amber-200 font-medium">
              Lucro/Prejuízo Calculado
            </Label>
            <div className={`px-4 py-4 rounded-xl border-2 font-bold text-center bg-zinc-900/30 transition-all duration-300 ${profit >= 0 ? 'text-green-400 border-green-500/30 bg-green-500/5' : 'text-red-400 border-red-500/30 bg-red-500/5'}`}>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">{formatCurrencyWithSign(profit)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={createBetMutation.isPending}
              className="flex-1 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black h-12 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 transform hover:scale-[1.02]"
            >
              {createBetMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Criar Aposta
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              className="px-6 rounded-xl flex items-center gap-2 border-zinc-600/50 bg-zinc-800/50 text-zinc-300 hover:text-amber-400 hover:bg-zinc-700/50 hover:border-amber-500/30 transition-all duration-300 h-12"
            >
              <X className="h-4 w-4" />
              Limpar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
