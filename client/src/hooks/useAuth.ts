import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export function useAuth() {
  const token = localStorage.getItem('supabase_access_token');
  const storedUser = localStorage.getItem('supabase_user');
  
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: !!token,
  });

  // If there's an auth error, clear localStorage
  if (error && token) {
    localStorage.removeItem('supabase_access_token');
    localStorage.removeItem('supabase_user');
    window.location.reload();
  }

  const logout = () => {
    localStorage.removeItem('supabase_access_token');
    localStorage.removeItem('supabase_user');
    queryClient.invalidateQueries();
    window.location.href = "/login";
  };

  // Use stored user if available while loading, otherwise use fetched user
  const currentUser = user || (storedUser ? JSON.parse(storedUser) : null);

  return {
    user: currentUser,
    isLoading: !!token && isLoading,
    isAuthenticated: !!token && (!!user || !!storedUser),
    logout,
  };
}
