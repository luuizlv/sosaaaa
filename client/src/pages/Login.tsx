import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { Eye, EyeOff } from "lucide-react";

interface AuthResponse {
  user: any;
  session: any;
  access_token: string;
  message?: string;
}

export default function Login() {
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json() as Promise<AuthResponse>;
    },
    onSuccess: (data) => {
      if (data.access_token) {
        localStorage.setItem('supabase_access_token', data.access_token);
        localStorage.setItem('supabase_user', JSON.stringify(data.user));
        // Force page reload to update auth state
        window.location.href = "/";
      }
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; username: string }) => {
      const res = await apiRequest("POST", "/api/auth/signup", data);
      return res.json() as Promise<AuthResponse>;
    },
    onSuccess: (data) => {
      if (data.access_token) {
        localStorage.setItem('supabase_access_token', data.access_token);
        localStorage.setItem('supabase_user', JSON.stringify(data.user));
        // Force page reload to update auth state
        window.location.href = "/";
      }
    },
  });

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    loginMutation.mutate({
      email: formData.get("username") as string,
      password: formData.get("password") as string,
    });
  };

  const handleSignup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    signupMutation.mutate({
      email: '', // No email needed
      password: formData.get("password") as string,
      username: formData.get("username") as string,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-amber-500/10 to-yellow-500/5 rounded-full blur-3xl"></div>
      </div>
      
      <Card className="w-full max-w-md bg-zinc-950/90 backdrop-blur-xl border-amber-500/30 shadow-2xl shadow-amber-500/20 relative">
        <CardHeader className="space-y-6 text-center">
          <div className="mx-auto w-24 h-24 rounded-full overflow-hidden shadow-2xl shadow-wine-light/30 ring-4 ring-wine-light/20">
            <img 
              src="https://cdn.discordapp.com/attachments/1191765556534190242/1408306889640640523/ChatGPT_Image_22_de_ago._de_2025_01_28_18.png?ex=68a9437f&is=68a7f1ff&hm=fea155a28cd4b56e6ad4d195a77deac342306c4c29120bf9938f3659433ae8c4" 
              alt="SOSA Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-4xl font-bold text-amber-400">
              SOSA
            </CardTitle>
            <CardDescription className="text-amber-200/70 text-lg font-medium">
              🎰 Sua plataforma de controle de apostas 🎲
            </CardDescription>
          </div>
        </CardHeader>
        
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-900/50 border border-amber-500/20 rounded-xl">
            <TabsTrigger 
              value="login" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/30 data-[state=active]:to-yellow-500/30 data-[state=active]:text-amber-300 data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/20 transition-all duration-300 rounded-lg"
            >
              ✨ Entrar
            </TabsTrigger>
            <TabsTrigger 
              value="signup" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/30 data-[state=active]:to-yellow-500/30 data-[state=active]:text-amber-300 data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/20 transition-all duration-300 rounded-lg"
            >
              🚀 Criar Conta
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="mt-6">
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="username" className="text-amber-200 font-medium">👤 Nome de usuário</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Digite seu nome de usuário"
                    required
                    className="bg-zinc-900/50 border-zinc-700/50 text-white placeholder:text-zinc-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-300 h-12 rounded-xl"
                    data-testid="input-username-login"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="password" className="text-amber-200 font-medium">🔒 Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua senha"
                      required
                      className="bg-zinc-900/50 border-zinc-700/50 text-white placeholder:text-zinc-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-300 h-12 rounded-xl pr-12"
                      data-testid="input-password-login"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-zinc-400 hover:text-amber-400 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {loginMutation.error && (
                  <div className="animate-fadeIn">
                    <Alert variant="destructive" className="border-red-500/30 bg-red-500/10 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                        <AlertDescription data-testid="text-login-error" className="text-red-300 font-medium">
                          {loginMutation.error.message}
                        </AlertDescription>
                      </div>
                    </Alert>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-6">
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 border-0 text-black font-semibold h-12 rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 transform hover:scale-[1.02]"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? "✨ Entrando..." : "🚀 Entrar"}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
          
          <TabsContent value="signup" className="mt-6">
            <form onSubmit={handleSignup}>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="username-signup" className="text-amber-200 font-medium">✨ Escolha um nome</Label>
                  <Input
                    id="username-signup"
                    name="username"
                    type="text"
                    placeholder="Escolha um nome único (sem espaços)"
                    required
                    pattern="[a-zA-Z0-9_]+"
                    title="Apenas letras, números e underscore (_)"
                    className="bg-zinc-900/50 border-zinc-700/50 text-white placeholder:text-zinc-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-300 h-12 rounded-xl"
                    data-testid="input-username-signup"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="password-signup" className="text-amber-200 font-medium">🔐 Crie sua senha</Label>
                  <div className="relative">
                    <Input
                      id="password-signup"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Crie uma senha forte"
                      required
                      minLength={6}
                      className="bg-zinc-900/50 border-zinc-700/50 text-white placeholder:text-zinc-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-300 h-12 rounded-xl pr-12"
                      data-testid="input-password-signup"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-zinc-400 hover:text-amber-400 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {signupMutation.error && (
                  <div className="animate-fadeIn">
                    <Alert variant="destructive" className="border-red-500/30 bg-red-500/10 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                        <AlertDescription data-testid="text-signup-error" className="text-red-300 font-medium">
                          {signupMutation.error.message}
                        </AlertDescription>
                      </div>
                    </Alert>
                  </div>
                )}
                
                {signupMutation.isSuccess && (
                  <div className="animate-fadeIn">
                    <Alert className="border-green-500/30 bg-green-500/10 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                        <AlertDescription data-testid="text-signup-success" className="text-green-300 font-medium">
                          {signupMutation.data?.message || "Conta criada com sucesso!"}
                        </AlertDescription>
                      </div>
                    </Alert>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-6">
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 border-0 text-black font-semibold h-12 rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 transform hover:scale-[1.02]"
                  disabled={signupMutation.isPending}
                  data-testid="button-signup"
                >
                  {signupMutation.isPending ? "✨ Criando..." : "🌟 Criar Conta"}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}