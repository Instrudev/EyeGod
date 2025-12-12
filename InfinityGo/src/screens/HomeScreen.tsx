import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuthContext } from '@store/AuthContext';
import {
  CoverageZone,
  DashboardSummary,
  fetchCollaboratorProgress,
  fetchCoverageZones,
  fetchDashboardSummary,
  fetchDailySurveys,
} from '@services/dashboardService';

const HomeScreen: React.FC = () => {
  const { user } = useAuthContext();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [coverage, setCoverage] = useState<CoverageZone[]>([]);
  const [daily, setDaily] = useState<{ label: string; total: number }[]>([]);
  const [progress, setProgress] = useState<{ nombre: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCollaborator = user?.role === 'COLABORADOR';

  const mapCenter = useMemo(() => {
    const item = coverage.find((c) => c.lat && c.lon) || coverage.find((c) => c.municipio_lat && c.municipio_lon);
    if (item?.lat && item?.lon) return `${item.lat},${item.lon}`;
    if (item?.municipio_lat && item?.municipio_lon) return `${item.municipio_lat},${item.municipio_lon}`;
    return '6.2476,-75.5658';
  }, [coverage]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [covRes, dailyRes, progressRes] = await Promise.all([
        fetchCoverageZones(),
        fetchDailySurveys(),
        fetchCollaboratorProgress(),
      ]);
      setCoverage(covRes);
      setDaily(dailyRes.map((row) => ({ label: row.fecha_creacion, total: row.total })));
      setProgress(progressRes.map((row) => ({ nombre: row.nombre, total: row.encuestas_realizadas })));
      if (!isCollaborator) {
        const summaryRes = await fetchDashboardSummary();
        setSummary(summaryRes);
      } else {
        setSummary(null);
      }
    } catch (err) {
      console.error(err);
      setError('No pudimos cargar el tablero. Intenta nuevamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />} style={styles.container}>
      <Text style={styles.title}>Panel general</Text>
      {loading && <ActivityIndicator />}
      {error && <Text style={styles.error}>{error}</Text>}
      {summary && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Indicadores</Text>
          <Text>Total encuestas: {summary.total_encuestas}</Text>
          <Text>Zonas cumplidas: {summary.zonas_cumplidas}</Text>
          <Text>Zonas sin cobertura: {summary.zonas_sin_cobertura}</Text>
          <Text>Casos activos: {summary.casos_activos}</Text>
          <Text style={styles.sectionSubtitle}>Top necesidades</Text>
          {summary.top_necesidades.map((item) => (
            <Text key={item.necesidad__nombre}>
              {item.necesidad__nombre}: {item.total}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Cobertura por zonas</Text>
        <Text style={styles.sectionSubtitle}>Centro de mapa: {mapCenter}</Text>
        {coverage.map((item) => (
          <View key={item.zona} style={styles.row}>
            <Text style={styles.rowTitle}>{item.zona_nombre}</Text>
            <Text>Municipio: {item.municipio_nombre}</Text>
            <Text>Meta: {item.meta_encuestas} · Realizadas: {item.total_encuestas}</Text>
            <Text>Estado: {item.estado_cobertura}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Encuestas por día</Text>
        {daily.map((item) => (
          <Text key={item.label}>
            {item.label}: {item.total}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Avance colaboradores</Text>
        {progress.map((item) => (
          <Text key={item.nombre}>
            {item.nombre}: {item.total}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 16, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionSubtitle: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  row: { marginBottom: 10 },
  rowTitle: { fontWeight: '700' },
  error: { color: 'red', marginVertical: 8 },
});

export default HomeScreen;
