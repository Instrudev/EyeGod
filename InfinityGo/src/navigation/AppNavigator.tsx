import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationProp, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '@screens/HomeScreen';
import LoginScreen from '@screens/LoginScreen';
import { useAuth } from '@hooks/useAuth';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
};

export const navigationRef = createNavigationContainerRef<NavigationProp<RootStackParamList>>();

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {isAuthenticated ? (
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Panel' }} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
