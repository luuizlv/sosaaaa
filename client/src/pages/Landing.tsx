import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { TrendingUp, PieChart, BarChart3, Eye, EyeOff } from "lucide-react";

interface AuthResponse {
  user: any;
  session: any;
  access_token: string;
  message?: string;
}

function Landing() {
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
        window.location.href = "/";
      }
    },
  });

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    loginMutation.mutate({
      email: formData.get("emailOrUsername") as string,
      password: formData.get("password") as string,
    });
  };

  const handleSignup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    signupMutation.mutate({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      username: formData.get("username") as string,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Info */}
        <div className="space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl lg:text-6xl font-bold mb-4 text-amber-400 drop-shadow-lg">
              SOSA
            </h1>
            <p className="text-xl mb-8 text-zinc-400">
              Sua plataforma de controle inteligente para apostas
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Card className="text-center p-6 border bg-zinc-950 border-zinc-800">
              <CardContent className="pt-6">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
                <h3 className="text-lg font-semibold mb-2 text-zinc-200">Dashboard Inteligente</h3>
                <p className="text-zinc-400">
                  Visualize lucros, perdas e ROI em tempo real com gráficos interativos
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6 border bg-zinc-950 border-zinc-800">
              <CardContent className="pt-6">
                <PieChart className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
                <h3 className="text-lg font-semibold mb-2 text-zinc-200">Tipos de Apostas</h3>
                <p className="text-zinc-400">
                  Organize por Surebet, Giros grátis, Superodd e muito mais
                </p>
              </CardContent>
            </Card>

            <Card className="text-center p-6 border bg-zinc-950 border-zinc-800">
              <CardContent className="pt-6">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
                <h3 className="text-lg font-semibold mb-2 text-zinc-200">Análises Avançadas</h3>
                <p className="text-zinc-400">
                  Filtros por período, casa de apostas e relatórios detalhados
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="flex justify-center">
          <Card className="w-full max-w-md bg-zinc-950 border-zinc-800">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center text-zinc-200">
                Acesse sua conta
              </CardTitle>
            </CardHeader>
            
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-zinc-900 border-zinc-700">
                <TabsTrigger value="login" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-yellow-400">
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-yellow-400">
                  Criar Conta
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="emailOrUsername" className="text-zinc-300">Email</Label>
                      <Input
                        id="emailOrUsername"
                        name="emailOrUsername"
                        type="text"
                        placeholder="exemplo@email.com"
                        required
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-yellow-400 focus:ring-yellow-400"
                        data-testid="input-email-login"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-zinc-300">Senha</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Digite sua senha"
                          required
                          className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-yellow-400 focus:ring-yellow-400"
                          data-testid="input-password-login"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-zinc-400 hover:text-cyan-400"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {loginMutation.error && (
                      <Alert variant="destructive">
                        <AlertDescription data-testid="text-login-error">
                          {loginMutation.error.message}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                  <div className="p-6 pt-0">
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 border-0 text-black font-semibold"
                      disabled={loginMutation.isPending}
                      data-testid="button-login"
                    >
                      {loginMutation.isPending ? "Entrando..." : "Entrar"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignup}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-zinc-300">Username</Label>
                      <Input
                        id="username"
                        name="username"
                        type="text"
                        placeholder="escolha_um_nome"
                        required
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:ring-cyan-400"
                        data-testid="input-username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-signup" className="text-zinc-300">Email</Label>
                      <Input
                        id="email-signup"
                        name="email"
                        type="email"
                        placeholder="exemplo@email.com"
                        required
                        className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:ring-cyan-400"
                        data-testid="input-email-signup"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password-signup" className="text-zinc-300">Senha</Label>
                      <div className="relative">
                        <Input
                          id="password-signup"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Crie uma senha forte"
                          required
                          minLength={6}
                          className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-cyan-400 focus:ring-cyan-400"
                          data-testid="input-password-signup"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-zinc-400 hover:text-cyan-400"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {signupMutation.error && (
                      <Alert variant="destructive">
                        <AlertDescription data-testid="text-signup-error">
                          {signupMutation.error.message}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {signupMutation.isSuccess && (
                      <Alert>
                        <AlertDescription data-testid="text-signup-success">
                          {signupMutation.data?.message || "Conta criada com sucesso!"}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                  <div className="p-6 pt-0">
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 border-0 text-black font-semibold"
                      disabled={signupMutation.isPending}
                      data-testid="button-signup"
                    >
                      {signupMutation.isPending ? "Criando..." : "Criar Conta"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Landing;