import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationProp, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '@screens/HomeScreen';
import LoginScreen from '@screens/LoginScreen';
import { useAuth } from '@hooks/useAuth';
import CreateLeaderScreen from '@screens/CreateLeaderScreen';
import CreateCandidateScreen from '@screens/CreateCandidateScreen';
import CreateSurveyScreen from '@screens/CreateSurveyScreen';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

export type AdminTabParamList = {
  Dashboard: undefined;
  Leader: undefined;
  Candidate: undefined;
  Survey: undefined;
};

export const navigationRef = createNavigationContainerRef<NavigationProp<RootStackParamList>>();

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<AdminTabParamList>();

const AdminTabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: '#1f6feb',
      tabBarInactiveTintColor: '#6b7280',
      tabBarIcon: ({ color, size }) => {
        const iconName =
          route.name === 'Dashboard'
            ? 'home'
            : route.name === 'Leader'
              ? 'people'
              : route.name === 'Candidate'
                ? 'person-add'
                : 'clipboard';
        return <Ionicons name={iconName as never} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Dashboard" component={HomeScreen} options={{ title: 'Panel' }} />
    <Tab.Screen name="Leader" component={CreateLeaderScreen} options={{ title: 'Líderes' }} />
    <Tab.Screen name="Candidate" component={CreateCandidateScreen} options={{ title: 'Candidatos' }} />
    <Tab.Screen name="Survey" component={CreateSurveyScreen} options={{ title: 'Encuestas' }} />
  </Tab.Navigator>
);

const MainApp: React.FC = () => {
  const { user } = useAuth();

  if (user?.role === 'ADMIN') {
    return <AdminTabs />;
  }

  return <HomeScreen />;
};

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
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainApp} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
