import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthTokens, User } from '@services/authService';

const AUTH_KEY = 'infinitygo/auth';

export interface StoredAuth {
  tokens: AuthTokens;
  user: User;
}

export const persistAuth = async (data: StoredAuth) => {
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(data));
};

export const readStoredAuth = async (): Promise<StoredAuth | null> => {
  const value = await AsyncStorage.getItem(AUTH_KEY);
  return value ? (JSON.parse(value) as StoredAuth) : null;
};

export const clearStoredAuth = async () => {
  await AsyncStorage.removeItem(AUTH_KEY);
};
