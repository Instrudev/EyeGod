import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { CoverageZone } from '@services/dashboardService';
import { CollaboratorDashboardData, fetchCollaboratorDashboard } from '@services/collaboratorService';
import { useAuthContext } from '@store/AuthContext';
import { CollaboratorTabParamList } from '@navigation/AppNavigator';

const CollaboratorDashboardScreen: React.FC = () => {
  const { user, signOut } = useAuthContext();
  const navigation = useNavigation<NavigationProp<CollaboratorTabParamList>>();

  const [data, setData] = useState<CollaboratorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetchCollaboratorDashboard();
      setData(response);
    } catch (loadError) {
      console.error(loadError);
      setError('No pudimos cargar tu panel. Intenta nuevamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [user?.id]);

  const assignedZones = data?.coverage.length ?? 0;
  const assignedGoal = data?.metrics.assignedGoal ?? 0;
  const completedSurveys = data?.metrics.totalSurveys ?? 0;
  const progressPercentage = data?.metrics.progressPercentage ?? 0;

  const sortedZones = useMemo<CoverageZone[]>(() => {
    if (!data?.coverage) return [];
    return [...data.coverage].sort((a, b) => (b.meta_encuestas ?? 0) - (a.meta_encuestas ?? 0));
  }, [data]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const confirmLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.content}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>Panel del colaborador</Text>
          <Text style={styles.subtitle}>Gestiona tus encuestas asignadas y acceso rápido a tus tareas.</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={20} color="#0f172a" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {loading && <ActivityIndicator style={styles.loading} />}

      <View style={styles.cardGrid}>
        <SummaryCard title="Encuestas asignadas" value={assignedGoal} icon="clipboard" color="#1f6feb" />
        <SummaryCard title="Encuestas realizadas" value={completedSurveys} icon="checkmark-done" color="#16a34a" />
        <SummaryCard title="Zonas asignadas" value={assignedZones} icon="map" color="#d97706" />
        <SummaryCard title="Avance" value={`${progressPercentage}%`} icon="trending-up" color="#0ea5e9" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Accesos rápidos</Text>
        <View style={styles.quickActions}>
          <QuickAction
            label="Registrar encuesta"
            icon="create"
            onPress={() => navigation.navigate('SurveyForm')}
            color="#1f6feb"
          />
          <QuickAction
            label="Ver historial"
            icon="time"
            onPress={() => navigation.navigate('SurveyHistory')}
            color="#9333ea"
          />
          <QuickAction
            label="Ver avance"
            icon="podium"
            onPress={() => navigation.navigate('CollaboratorProgress')}
            color="#16a34a"
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Zonas asignadas</Text>
        {loading && <ActivityIndicator />}
        {!loading && sortedZones.length === 0 && <Text style={styles.muted}>Aún no tienes zonas asignadas.</Text>}
        {!loading &&
          sortedZones.map((zone) => (
            <View key={`${zone.zona}-${zone.municipio_nombre}`} style={styles.zoneRow}>
              <View style={styles.zoneInfo}>
                <Text style={styles.zoneTitle}>{zone.zona_nombre || 'Zona'}</Text>
                <Text style={styles.zoneSubtitle}>{zone.municipio_nombre || 'Sin municipio'}</Text>
              </View>
              <View style={styles.zoneKpi}>
                <Text style={styles.zoneValue}>
                  {zone.total_encuestas}/{zone.meta_encuestas}
                </Text>
                <Text style={styles.zoneLabel}>Encuestas</Text>
              </View>
            </View>
          ))}
      </View>
    </ScrollView>
  );
};

const SummaryCard: React.FC<{ title: string; value: number | string; icon: keyof typeof Ionicons.glyphMap; color: string }> = ({
  title,
  value,
  icon,
  color,
}) => (
  <View style={[styles.summaryCard, { borderColor: color }]}> 
    <View style={[styles.iconWrapper, { backgroundColor: `${color}15` }]}> 
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryTitle}>{title}</Text>
  </View>
);

const QuickAction: React.FC<{ label: string; icon: keyof typeof Ionicons.glyphMap; color: string; onPress: () => void }> = ({
  label,
  icon,
  color,
  onPress,
}) => (
  <TouchableOpacity style={[styles.quickCard, { backgroundColor: `${color}15` }]} onPress={onPress}>
    <Ionicons name={icon} size={22} color={color} />
    <Text style={[styles.quickLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTextBlock: { flex: 1 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { color: '#475569', marginTop: 4, marginBottom: 12 },
  loading: { marginVertical: 8 },
  error: { color: '#b91c1c', marginBottom: 8 },
  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoutText: { color: '#0f172a', fontWeight: '700' },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryValue: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginTop: 6 },
  summaryTitle: { color: '#475569', marginTop: 4 },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#0f172a' },
  quickActions: { flexDirection: 'row', gap: 10 },
  quickCard: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickLabel: { fontWeight: '700', marginTop: 8 },
  muted: { color: '#94a3b8' },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  zoneInfo: { flex: 1 },
  zoneTitle: { fontWeight: '700', color: '#0f172a' },
  zoneSubtitle: { color: '#475569', marginTop: 2 },
  zoneKpi: { alignItems: 'flex-end' },
  zoneValue: { fontWeight: '800', color: '#0f172a', fontSize: 16 },
  zoneLabel: { color: '#475569' },
});

export default CollaboratorDashboardScreen;
