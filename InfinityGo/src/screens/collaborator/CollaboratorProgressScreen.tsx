import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CoverageZone } from '@services/dashboardService';
import { CollaboratorMetrics, fetchCollaboratorProgress } from '@services/collaboratorService';
import { useAuthContext } from '@store/AuthContext';

const CollaboratorProgressScreen: React.FC = () => {
  const { user } = useAuthContext();
  const [coverage, setCoverage] = useState<CoverageZone[]>([]);
  const [metrics, setMetrics] = useState<CollaboratorMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCollaborator = (user?.role || '').toUpperCase() === 'COLABORADOR';

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetchCollaboratorProgress();
      setCoverage(response.coverage);
      setMetrics(response.metrics);
    } catch (loadError) {
      console.error(loadError);
      setError('No pudimos cargar tu avance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const zonesWithProgress = useMemo(() => {
    return coverage.map((zone) => {
      const progress = zone.meta_encuestas > 0 ? Math.min(100, Math.round((zone.total_encuestas / zone.meta_encuestas) * 100)) : 0;
      return { ...zone, progress };
    });
  }, [coverage]);

  if (!isCollaborator) {
    return (
      <View style={styles.centered}>
        <Text style={styles.warning}>El avance personal está disponible solo para colaboradores.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Avance personal</Text>
      <Text style={styles.subtitle}>Consulta tu meta, avance y cobertura por zona.</Text>

      {error && <Text style={styles.error}>{error}</Text>}
      {loading && <ActivityIndicator style={styles.loading} />}

      {metrics && (
        <View style={styles.metricsGrid}>
          <MetricCard title="Encuestas realizadas" value={metrics.totalSurveys} color="#2563eb" />
          <MetricCard title="Meta asignada" value={metrics.assignedGoal} color="#0ea5e9" />
          <MetricCard title="Porcentaje de avance" value={`${metrics.progressPercentage}%`} color="#16a34a" />
          <MetricCard title="Zonas cubiertas" value={metrics.coveredZones} color="#22c55e" />
          <MetricCard title="Zonas pendientes" value={metrics.pendingZones} color="#ef4444" />
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Detalle por zona</Text>
        {loading && <Text style={styles.muted}>Cargando zonas...</Text>}
        {!loading && zonesWithProgress.length === 0 && <Text style={styles.muted}>Aún no tienes zonas asignadas.</Text>}
        {!loading &&
          zonesWithProgress.map((zone) => (
            <View key={`${zone.zona}-${zone.municipio_nombre}`} style={styles.zoneRow}>
              <View style={styles.zoneInfo}>
                <Text style={styles.zoneTitle}>{zone.zona_nombre || 'Zona'}</Text>
                <Text style={styles.zoneSubtitle}>{zone.municipio_nombre || 'Sin municipio'}</Text>
              </View>
              <View style={styles.zoneKpi}>
                <Text style={styles.zoneValue}>
                  {zone.total_encuestas}/{zone.meta_encuestas}
                </Text>
                <ProgressBar progress={zone.progress} />
              </View>
            </View>
          ))}
      </View>
    </ScrollView>
  );
};

const MetricCard: React.FC<{ title: string; value: number | string; color: string }> = ({ title, value, color }) => (
  <View style={[styles.metricCard, { backgroundColor: `${color}15`, borderColor: color }]}>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
    <Text style={styles.metricTitle}>{title}</Text>
  </View>
);

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <View style={styles.progressTrack}>
    <View style={[styles.progressFill, { width: `${Math.max(8, progress)}%` }]}>
      <Text style={styles.progressText}>{progress}%</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { color: '#475569', marginTop: 4, marginBottom: 12 },
  loading: { marginVertical: 8 },
  error: { color: '#b91c1c', marginBottom: 8 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    width: '48%',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  metricValue: { fontSize: 20, fontWeight: '800' },
  metricTitle: { color: '#475569', marginTop: 4, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, color: '#0f172a' },
  muted: { color: '#6b7280' },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  zoneInfo: { flex: 1 },
  zoneTitle: { fontWeight: '700', color: '#0f172a' },
  zoneSubtitle: { color: '#475569', marginTop: 2 },
  zoneKpi: { alignItems: 'flex-end', minWidth: '40%' },
  zoneValue: { fontWeight: '800', color: '#0f172a', fontSize: 16, marginBottom: 4 },
  progressTrack: {
    width: '100%',
    height: 18,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  progressText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  warning: { color: '#b45309', textAlign: 'center' },
});

export default CollaboratorProgressScreen;
