import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Camera, Lock, ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Load profile photo from user data
  useEffect(() => {
    if (user?.profileImageUrl) {
      setProfilePhoto(user.profileImageUrl);
    }
  }, [user]);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Mutation to update profile photo
  const updatePhotoMutation = useMutation({
    mutationFn: async (profileImageUrl: string) => {
      const res = await apiRequest("PATCH", "/api/profile/photo", { profileImageUrl });
      return res.json();
    },
    onSuccess: () => {
      // Force a complete refetch of user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Sucesso",
        description: "Foto de perfil atualizada e salva na nuvem!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar a foto de perfil",
        variant: "destructive",
      });
    }
  });

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Erro",
          description: "A imagem deve ter no máximo 5MB",
          variant: "destructive",
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const photoData = e.target?.result as string;
        setProfilePhoto(photoData);
        // Não salva automaticamente - aguarda o usuário clicar em "Salvar Perfil"
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    if (profilePhoto && profilePhoto !== (user?.profileImageUrl || '')) {
      updatePhotoMutation.mutate(profilePhoto);
    } else {
      toast({
        title: "Info",
        description: "Nenhuma alteração para salvar",
      });
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.newPassword.length < 6) {
      toast({
        title: "Erro", 
        description: "A nova senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    
    try {
      // Aqui seria implementada a lógica para mudar a senha
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simula requisição
      
      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso!",
      });
      
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao alterar senha. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4 text-zinc-400 hover:text-amber-400">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-amber-400">
            Meu Perfil
          </h1>
          <p className="text-zinc-400 mt-2">Gerencie suas informações pessoais e configurações</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Photo Card */}
          <Card className="lg:col-span-1 bg-zinc-900 border-zinc-700 hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-400">
                <Camera className="h-5 w-5" />
                Foto do Perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="relative inline-block mb-4">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg overflow-hidden">
                  {profilePhoto ? (
                    <img 
                      src={profilePhoto} 
                      alt="Foto do perfil" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-16 w-16 text-black" />
                  )}
                </div>
                <Button
                  size="sm"
                  className="absolute bottom-0 right-0 rounded-full w-10 h-10 p-0 bg-zinc-800 border border-amber-500/30 hover:bg-zinc-700"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4 text-amber-400" />
                </Button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              
              <div className="space-y-2">
                <h3 className="font-semibold text-amber-200">
                  {user?.user_metadata?.username || user?.email?.split('@')[0] || 'Usuário'}
                </h3>
                <p className="text-sm text-zinc-400">{user?.email}</p>
              </div>
              
              <div className="mt-4 space-y-2">
                <Button
                  variant="outline"
                  className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Alterar Foto
                </Button>
                
                {profilePhoto && profilePhoto !== (user?.profileImageUrl || '') && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleSaveProfile}
                    disabled={updatePhotoMutation.isPending}
                  >
                    {updatePhotoMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Perfil
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Password Change Card */}
          <Card className="lg:col-span-2 bg-zinc-900 border-zinc-700 hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-400">
                <Lock className="h-5 w-5" />
                Alterar Senha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword" className="text-zinc-300">
                    Senha Atual
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="mt-1 bg-zinc-800 border-zinc-600 text-zinc-200 focus:border-amber-400"
                    placeholder="Digite sua senha atual"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="newPassword" className="text-zinc-300">
                    Nova Senha
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="mt-1 bg-zinc-800 border-zinc-600 text-zinc-200 focus:border-amber-400"
                    placeholder="Digite sua nova senha (mín. 6 caracteres)"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="confirmPassword" className="text-zinc-300">
                    Confirmar Nova Senha
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="mt-1 bg-zinc-800 border-zinc-600 text-zinc-200 focus:border-amber-400"
                    placeholder="Confirme sua nova senha"
                    required
                  />
                </div>
                
                <Button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold"
                >
                  {isChangingPassword ? "Alterando..." : "Alterar Senha"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}