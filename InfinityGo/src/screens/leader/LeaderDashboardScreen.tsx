import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { CoverageZone } from '@services/dashboardService';
import { fetchLeaderDashboard, fetchLeaderSurveyStats, LeaderDashboardData, LeaderSurveyStats } from '@services/leaderService';
import { useAuthContext } from '@store/AuthContext';
import { LeaderTabParamList } from '@navigation/AppNavigator';

const LeaderDashboardScreen: React.FC = () => {
  const { signOut } = useAuthContext();
  const navigation = useNavigation<NavigationProp<LeaderTabParamList>>();

  const [data, setData] = useState<LeaderDashboardData | null>(null);
  const [surveyStats, setSurveyStats] = useState<LeaderSurveyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthError = (err: unknown) => {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) {
      signOut();
    }
  };

  const loadDashboard = async () => {
    setError(null);
    setLoading(true);
    try {
      const [response, stats] = await Promise.all([fetchLeaderDashboard(), fetchLeaderSurveyStats()]);
      setData(response);
      setSurveyStats(stats);
    } catch (loadError) {
      console.error(loadError);
      handleAuthError(loadError);
      setError('No pudimos cargar tu panel de líder. Intenta nuevamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const sortedCoverage = useMemo<CoverageZone[]>(() => {
    if (!data?.coverage) return [];
    return [...data.coverage].sort((a, b) => (b.meta_encuestas ?? 0) - (a.meta_encuestas ?? 0));
  }, [data?.coverage]);

  const confirmLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
    ]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const metrics = data?.metrics;
  const metaVotantes = user?.meta_votantes ?? 0;
  const validVoters = surveyStats?.validVoters ?? 0;
  const progressPercent = metaVotantes > 0 ? Math.min(100, Math.round((validVoters / metaVotantes) * 100)) : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.content}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>Panel del líder</Text>
          <Text style={styles.subtitle}>
            Administra tu equipo de colaboradores y revisa el avance de encuestas asignadas.
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={20} color="#0f172a" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {loading && <ActivityIndicator style={styles.loading} />}

      <View style={styles.cardGrid}>
        <SummaryCard title="Colaboradores creados" value={metrics?.totalCollaborators ?? 0} color="#1f6feb" icon="people" />
        <SummaryCard title="Colaboradores activos" value={metrics?.activeCollaborators ?? 0} color="#16a34a" icon="person" />
        <SummaryCard title="Encuestas del equipo" value={metrics?.teamSurveys ?? 0} color="#d97706" icon="clipboard" />
        <SummaryCard title="Avance promedio" value={`${metrics?.averageProgress ?? 0}%`} color="#0ea5e9" icon="trending-up" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Meta de votantes</Text>
        <View style={styles.goalRow}>
          <View style={styles.goalItem}>
            <Text style={styles.goalValue}>{metaVotantes}</Text>
            <Text style={styles.goalLabel}>Meta asignada</Text>
          </View>
          <View style={styles.goalItem}>
            <Text style={styles.goalValue}>{validVoters}</Text>
            <Text style={styles.goalLabel}>Votantes válidos</Text>
          </View>
          <View style={styles.goalItem}>
            <Text style={styles.goalValue}>{progressPercent}%</Text>
            <Text style={styles.goalLabel}>Avance</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Accesos rápidos</Text>
        <View style={styles.quickActions}>
          <QuickAction
            label="Crear colaborador"
            icon="person-add"
            onPress={() => navigation.navigate('LeaderCollaborators')}
            color="#1f6feb"
          />
          <QuickAction
            label="Ver colaboradores"
            icon="people"
            onPress={() => navigation.navigate('LeaderCollaborators')}
            color="#9333ea"
          />
          <QuickAction
            label="Cobertura"
            icon="map"
            onPress={() => navigation.navigate('LeaderCoverage')}
            color="#16a34a"
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cobertura por zona</Text>
        {loading && <ActivityIndicator />}
        {!loading && sortedCoverage.length === 0 && (
          <Text style={styles.muted}>Aún no tienes zonas asignadas para tu equipo.</Text>
        )}
        {!loading &&
          sortedCoverage.slice(0, 5).map((zone) => (
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
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  goalItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  goalValue: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  goalLabel: { color: '#64748b', marginTop: 4 },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickCard: {
    width: '32%',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
  },
  quickLabel: { fontWeight: '700', textAlign: 'center' },
  muted: { color: '#64748b' },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  zoneInfo: { flex: 1 },
  zoneTitle: { fontWeight: '700', color: '#0f172a' },
  zoneSubtitle: { color: '#64748b', marginTop: 2 },
  zoneKpi: { alignItems: 'flex-end' },
  zoneValue: { fontWeight: '800', color: '#0f172a' },
  zoneLabel: { color: '#64748b', marginTop: 2 },
});

export default LeaderDashboardScreen;
