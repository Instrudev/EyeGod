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
import CollaboratorDashboardScreen from '@screens/collaborator/CollaboratorDashboardScreen';
import SurveyFormScreen from '@screens/collaborator/SurveyFormScreen';
import SurveyHistoryScreen from '@screens/collaborator/SurveyHistoryScreen';
import CollaboratorProgressScreen from '@screens/collaborator/CollaboratorProgressScreen';

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

export type CollaboratorTabParamList = {
  CollaboratorDashboard: undefined;
  SurveyForm: undefined;
  SurveyHistory: undefined;
  CollaboratorProgress: undefined;
};

export const navigationRef = createNavigationContainerRef<NavigationProp<RootStackParamList>>();

const Stack = createNativeStackNavigator<RootStackParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();
const CollaboratorTab = createBottomTabNavigator<CollaboratorTabParamList>();

const AdminTabs: React.FC = () => (
  <AdminTab.Navigator
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
    <AdminTab.Screen name="Dashboard" component={HomeScreen} options={{ title: 'Panel' }} />
    <AdminTab.Screen name="Leader" component={CreateLeaderScreen} options={{ title: 'Líderes' }} />
    <AdminTab.Screen name="Candidate" component={CreateCandidateScreen} options={{ title: 'Candidatos' }} />
    <AdminTab.Screen name="Survey" component={CreateSurveyScreen} options={{ title: 'Encuestas' }} />
  </AdminTab.Navigator>
);

const CollaboratorTabs: React.FC = () => (
  <CollaboratorTab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: '#1f6feb',
      tabBarInactiveTintColor: '#6b7280',
      tabBarIcon: ({ color, size }) => {
        const iconName =
          route.name === 'CollaboratorDashboard'
            ? 'home'
            : route.name === 'SurveyForm'
              ? 'create'
              : route.name === 'SurveyHistory'
                ? 'time'
                : 'podium';
        return <Ionicons name={iconName as never} size={size} color={color} />;
      },
    })}
  >
    <CollaboratorTab.Screen
      name="CollaboratorDashboard"
      component={CollaboratorDashboardScreen}
      options={{ title: 'Panel' }}
    />
    <CollaboratorTab.Screen name="SurveyForm" component={SurveyFormScreen} options={{ title: 'Registrar' }} />
    <CollaboratorTab.Screen name="SurveyHistory" component={SurveyHistoryScreen} options={{ title: 'Historial' }} />
    <CollaboratorTab.Screen
      name="CollaboratorProgress"
      component={CollaboratorProgressScreen}
      options={{ title: 'Avance' }}
    />
  </CollaboratorTab.Navigator>
);

const MainApp: React.FC = () => {
  const { user } = useAuth();

  const role = (user?.role || '').toUpperCase();

  if (role === 'ADMIN') {
    return <AdminTabs />;
  }

  if (role === 'COLABORADOR') {
    return <CollaboratorTabs />;
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
