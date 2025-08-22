import { useState } from "react";
// Removed useAuth import since authentication is disabled
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import StatsCards from "@/components/StatsCards";
import ProfitProjectionChart from "@/components/ProfitProjectionChart";
import AddBetForm from "@/components/AddBetForm";
import BetsTable from "@/components/BetsTable";
import { Plus, X } from "lucide-react";
import type { BetFilters } from "@/lib/types";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddBetForm, setShowAddBetForm] = useState(false);
  const [filters, setFilters] = useState<BetFilters>({ period: 'daily' });
  const { toast } = useToast();
  // No authentication required - removed all auth checks

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-amber-500/5 to-yellow-500/3 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-tr from-amber-500/5 to-yellow-500/3 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-gradient-to-r from-amber-500/3 to-transparent rounded-full blur-2xl"></div>
      </div>
      
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex min-h-[calc(100vh-4rem)] relative">
        <Sidebar 
          open={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          filters={filters}
          onFiltersChange={setFilters}
        />
        
        <main className="flex-1 lg:ml-0 p-6 space-y-8 relative z-10">
          {/* Welcome section */}
          <div className="text-center py-4 animate-fadeIn">
            <h1 className="text-3xl font-bold text-amber-400 mb-2">
              Painel de Controle
            </h1>
          </div>
          
          <div className="animate-slideInLeft animate-delay-100">
            <StatsCards filters={filters} />
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 animate-slideInLeft animate-delay-200">
              <ProfitProjectionChart filters={filters} />
            </div>
            <div className="animate-slideInRight animate-delay-300">
              {!showAddBetForm ? (
                <Card className="p-6 border bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border-amber-500/20 shadow-xl shadow-amber-500/10 relative overflow-hidden hover-lift animate-bounceIn">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-2xl animate-float"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-yellow-500/10 to-transparent rounded-full blur-xl animate-float animate-delay-500"></div>
                  
                  <div className="relative z-10 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg animate-glow hover-scale">
                      <Plus className="h-8 w-8 text-black" />
                    </div>
                    <h3 className="text-lg font-semibold text-amber-400 mb-2">
                      Nova Aposta
                    </h3>
                    <p className="text-sm text-zinc-400 mb-6">
                      Clique para registrar uma nova aposta
                    </p>
                    <Button
                      onClick={() => setShowAddBetForm(true)}
                      className="w-full rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black h-12 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 transform hover:scale-[1.02] hover-lift"
                    >
                      <Plus className="h-5 w-5" />
                      Criar Aposta
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="relative">
                  <Button
                    onClick={() => setShowAddBetForm(false)}
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 z-20 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-full p-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <AddBetForm />
                </div>
              )}
            </div>
          </div>
          
          <div className="animate-slideInLeft animate-delay-400">
            <BetsTable filters={filters} />
          </div>
        </main>
      </div>
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
