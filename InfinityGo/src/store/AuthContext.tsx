import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearAuthToken, setAuthToken } from '@api/httpClient';
import { LoginPayload, LoginResponse, User, login } from '@services/authService';
import { clearStoredAuth, persistAuth, readStoredAuth } from '@utils/storage';

interface AuthContextValue {
  user: User | null;
  tokens: { access: string; refresh: string } | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signIn: (payload: LoginPayload) => Promise<LoginResponse>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<{ access: string; refresh: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const stored = await readStoredAuth();
        if (stored) {
          setUser(stored.user);
          setTokens(stored.tokens);
          setAuthToken(stored.tokens.access);
        }
      } catch (storageError) {
        console.warn('Unable to load stored credentials', storageError);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  const signIn = async (payload: LoginPayload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await login(payload);
      setUser(response.user);
      setTokens({ access: response.access, refresh: response.refresh });
      setAuthToken(response.access);
      await persistAuth({
        tokens: { access: response.access, refresh: response.refresh },
        user: response.user,
      });
      return response;
    } catch (authError: unknown) {
      const message =
        (authError as { response?: { data?: { detail?: string } }; message?: string }).response?.data?.detail ||
        (authError as Error)?.message ||
        'No se pudo iniciar sesión. Verifica tus datos.';
      setError(message);
      throw authError;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setUser(null);
    setTokens(null);
    clearAuthToken();
    await clearStoredAuth();
  };

  const value = useMemo(
    () => ({
      user,
      tokens,
      loading,
      isAuthenticated: Boolean(tokens?.access),
      error,
      signIn,
      signOut,
    }),
    [user, tokens, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
