import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { DateTimePickerAndroid, AndroidEvent } from '@react-native-community/datetimepicker';
import { useAuthContext } from '@store/AuthContext';
import {
  CollaboratorProgress,
  CoverageZone,
  DashboardSummary,
  DailySurvey,
  fetchCollaboratorProgress,
  fetchCoverageZones,
  fetchDashboardSummary,
  fetchDailySurveys,
} from '@services/dashboardService';

const coverageColors: Record<string, string> = {
  SIN_COBERTURA: '#dc3545',
  BAJA: '#fd7e14',
  MEDIA: '#ffc107',
  CUMPLIDA: '#28a745',
};

const HomeScreen: React.FC = () => {
  const { user, signOut } = useAuthContext();

  const [coverage, setCoverage] = useState<CoverageZone[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [dailySurveys, setDailySurveys] = useState<DailySurvey[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [kpiRestricted, setKpiRestricted] = useState(false);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const isCollaborator = user?.role === 'COLABORADOR';

  const mapRegion = useMemo(() => {
    const withCoords = coverage.find((zone) => (zone.lat && zone.lon) || (zone.municipio_lat && zone.municipio_lon));
    if (withCoords) {
      const latitude = Number(withCoords.lat ?? withCoords.municipio_lat ?? 6.2476);
      const longitude = Number(withCoords.lon ?? withCoords.municipio_lon ?? -75.5658);
      return { latitude, longitude, latitudeDelta: 0.6, longitudeDelta: 0.6 };
    }
    return { latitude: 6.2476, longitude: -75.5658, latitudeDelta: 0.6, longitudeDelta: 0.6 };
  }, [coverage]);

  const formatDate = (date: Date | null) => (date ? date.toISOString().split('T')[0] : undefined);

  const openDatePicker = (type: 'start' | 'end') => {
    const currentValue = type === 'start' ? startDate ?? new Date() : endDate ?? new Date();

    DateTimePickerAndroid.open({
      value: currentValue,
      mode: 'date',
      is24Hour: true,
      onChange: ({ type: eventType }: AndroidEvent, selectedDate?: Date) => {
        if (eventType === 'dismissed') return;
        if (selectedDate) {
          if (type === 'start') {
            setStartDate(selectedDate);
          } else {
            setEndDate(selectedDate);
          }
        }
      },
    });
  };

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    setRangeError(null);
    setKpiRestricted(false);
    try {
      const coverageResponse = await fetchCoverageZones();
      setCoverage(coverageResponse);

      if (!isCollaborator) {
        try {
          const summaryResponse = await fetchDashboardSummary();
          setSummary(summaryResponse);
          await loadRangeCharts(undefined, undefined);
        } catch (summaryError: unknown) {
          const status = (summaryError as { response?: { status?: number } }).response?.status;
          if (status === 403) {
            setKpiRestricted(true);
            setSummary(null);
          } else {
            throw summaryError;
          }
        }
      } else {
        setSummary(null);
      }
    } catch (loadError) {
      console.error(loadError);
      setError('No pudimos cargar el tablero territorial. Intenta nuevamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadRangeCharts = async (start?: string, end?: string) => {
    setRangeError(null);
    try {
      const [dailyResponse, collaboratorResponse] = await Promise.all([
        fetchDailySurveys(start, end),
        fetchCollaboratorProgress(start, end),
      ]);
      setDailySurveys(dailyResponse);
      setCollaborators(collaboratorResponse);
    } catch (rangeErr) {
      console.error(rangeErr);
      setRangeError('No pudimos cargar la información del rango seleccionado.');
    }
  };

  const handleSearchRange = async () => {
    setSearching(true);
    await loadRangeCharts(formatDate(startDate), formatDate(endDate));
    setSearching(false);
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.headerWrapper}>
        <LinearGradient colors={["#0f172a", "#1f2937", "#0b1220"]} style={styles.headerCard}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.title}>Panel de control territorial</Text>
              <Text style={styles.subtitle}>Seguimiento de cobertura, necesidades y rutas activas</Text>
              {user && (
                <View style={styles.userPill}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userRole}>{user.role}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
              <Text style={styles.logoutText}>Salir</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {kpiRestricted && !isCollaborator && (
        <Text style={styles.warning}>Tu rol no tiene acceso al resumen consolidado.</Text>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Filtro por rango de fechas</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker('start')}>
            <Text style={styles.dateLabel}>Fecha inicio</Text>
            <Text style={styles.dateValue}>{formatDate(startDate) || 'Selecciona fecha'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker('end')}>
            <Text style={styles.dateLabel}>Fecha fin</Text>
            <Text style={styles.dateValue}>{formatDate(endDate) || 'Selecciona fecha'}</Text>
          </TouchableOpacity>
        </View>
        {!isCollaborator && (
          <TouchableOpacity style={styles.primaryButton} onPress={handleSearchRange} disabled={searching}>
            <Text style={styles.primaryButtonText}>{searching ? 'Buscando...' : 'Buscar por rango'}</Text>
          </TouchableOpacity>
        )}
        {rangeError && <Text style={styles.error}>{rangeError}</Text>}
      </View>

      {!isCollaborator && summary && (
        <View style={styles.metricsGrid}>
          <MetricCard title="Encuestas totales" value={summary.total_encuestas} color="#1f6feb" />
          <MetricCard title="Zonas cumplidas" value={summary.zonas_cumplidas} color="#2ea043" />
          <MetricCard title="Zonas sin cobertura" value={summary.zonas_sin_cobertura} color="#d73a49" />
          <MetricCard title="Casos activos" value={summary.casos_activos} color="#d29922" />
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Mapa de cobertura</Text>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <View style={styles.mapContainer}>
            <MapView
              key={`${mapRegion.latitude}-${mapRegion.longitude}`}
              style={styles.map}
              initialRegion={mapRegion}
              mapType="none"
              showsCompass
              toolbarEnabled
              loadingEnabled
              zoomControlEnabled
            >
              <UrlTile
                urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                tileSize={256}
                maximumZ={19}
                shouldReplaceMapContent
              />
              {coverage
                .filter((zone) => zone.lat || zone.lon || zone.municipio_lat || zone.municipio_lon)
                .map((zone) => {
                  const latitude = Number(zone.lat ?? zone.municipio_lat ?? mapRegion.latitude);
                  const longitude = Number(zone.lon ?? zone.municipio_lon ?? mapRegion.longitude);
                  return (
                    <Marker
                      key={zone.zona}
                      coordinate={{ latitude, longitude }}
                      title={zone.zona_nombre}
                      description={`${zone.total_encuestas}/${zone.meta_encuestas} (${zone.cobertura_porcentaje}%)`}
                      pinColor={coverageColors[zone.estado_cobertura] || '#6c757d'}
                    />
                  );
                })}
            </MapView>
          </View>
        )}
      </View>

      {!isCollaborator && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Resultados del rango</Text>
          {searching && <ActivityIndicator />}
          <View style={styles.listSection}>
            <Text style={styles.sectionSubtitle}>Encuestas por día</Text>
            {dailySurveys.length === 0 ? (
              <Text style={styles.muted}>Sin datos para el rango seleccionado.</Text>
            ) : (
              dailySurveys.map((item) => (
                <Text key={item.fecha_creacion} style={styles.listItem}>
                  {item.fecha_creacion}: {item.total}
                </Text>
              ))
            )}
          </View>
          <View style={styles.listSection}>
            <Text style={styles.sectionSubtitle}>Avance por colaborador</Text>
            {collaborators.length === 0 ? (
              <Text style={styles.muted}>Sin datos para el rango seleccionado.</Text>
            ) : (
              collaborators.map((colab) => (
                <Text key={colab.id} style={styles.listItem}>
                  {colab.nombre}: {colab.encuestas_realizadas}/{colab.meta_encuestas}
                </Text>
              ))
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const MetricCard: React.FC<{ title: string; value: number; color: string }> = ({ title, value, color }) => (
  <View style={[styles.metricCard, { backgroundColor: color }]}> 
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricTitle}>{title}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerWrapper: { marginBottom: 14 },
  headerCard: {
    borderRadius: 16,
    padding: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerTextBlock: { flex: 1 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc' },
  subtitle: { color: '#cbd5e1', marginTop: 4 },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    gap: 8,
    marginTop: 10,
  },
  userName: { color: '#f8fafc', fontWeight: '700' },
  userRole: {
    color: '#cbd5e1',
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  logoutButton: {
    borderColor: '#e5e7eb',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignSelf: 'flex-start',
  },
  logoutText: { color: '#f8fafc', fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, color: '#111' },
  sectionSubtitle: { fontSize: 14, fontWeight: '700', marginTop: 8, color: '#111' },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateInput: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#f9fafb',
  },
  dateLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  dateValue: { fontSize: 14, fontWeight: '600', color: '#111' },
  primaryButton: {
    marginTop: 12,
    backgroundColor: '#1f6feb',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  metricCard: {
    width: '48%',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  metricValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
  metricTitle: { color: '#f3f4f6', marginTop: 6, fontWeight: '700' },
  mapContainer: {
    height: 320,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  map: { ...StyleSheet.absoluteFillObject },
  listSection: { marginTop: 10 },
  listItem: { marginTop: 4, color: '#111' },
  muted: { color: '#6b7280', marginTop: 4 },
  error: { color: '#b91c1c', marginBottom: 8 },
  warning: { color: '#b45309', marginBottom: 8 },
});

export default HomeScreen;
