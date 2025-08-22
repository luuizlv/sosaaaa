import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, User } from "lucide-react";
import { Link } from "wouter";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-wine-light/20 backdrop-blur-xl bg-gradient-to-r from-black via-oled-gray to-black shadow-lg shadow-wine-light/10">
      <div className="mx-auto flex h-16 max-w-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-zinc-400 hover:text-yellow-400 transition-colors"
            onClick={onToggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg shadow-wine-light/20 ring-2 ring-wine-light/30">
              <img 
                src="https://cdn.discordapp.com/attachments/1191765556534190242/1408306889640640523/ChatGPT_Image_22_de_ago._de_2025_01_28_18.png?ex=68a9437f&is=68a7f1ff&hm=fea155a28cd4b56e6ad4d195a77deac342306c4c29120bf9938f3659433ae8c4" 
                alt="SOSA Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <div className="text-xl font-bold tracking-tight text-amber-400">
                SOSA
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Link href="/profile">
            <div className="hidden sm:flex items-center gap-3 bg-oled-gray/50 rounded-xl px-3 py-2 border border-wine-light/20 hover:border-wine-light/40 transition-colors cursor-pointer">
            <div className="w-8 h-8 bg-gradient-to-br from-gold to-gold-light rounded-full flex items-center justify-center shadow-md overflow-hidden">
              {user?.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl} 
                  alt="Foto do perfil" 
                  className="w-full h-full object-cover"
                  key={`${user.profileImageUrl}-${Date.now()}`}
                />
              ) : (
                <User className="h-4 w-4 text-black" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gold-light">{user?.firstName || user?.email?.split('@')[0] || 'Usuário'}</span>
            </div>
            </div>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="flex items-center gap-2 rounded-xl border-red-500/30 bg-red-950/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-all duration-300"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
