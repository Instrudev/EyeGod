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

import { LinearGradient } from 'expo-linear-gradient';
import { DateTimePickerAndroid, AndroidEvent } from '@react-native-community/datetimepicker';
import { useAuthContext } from '@store/AuthContext';
import { WebView } from 'react-native-webview'; // <--- Importante
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
  const isAdmin = (user?.role || '').toUpperCase() === 'ADMIN';

  const surveysByMunicipio = useMemo(() => {
    const grouped: Record<string, { municipio: string; total: number }> = {};
    coverage.forEach((zone) => {
      if (!zone.municipio_nombre) return;
      if (!grouped[zone.municipio_nombre]) {
        grouped[zone.municipio_nombre] = { municipio: zone.municipio_nombre, total: 0 };
      }
      grouped[zone.municipio_nombre].total += zone.total_encuestas;
    });
    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }, [coverage]);

  // Calculamos el centro inicial del mapa
  const mapCenter = useMemo(() => {
    const withCoords = coverage.find((zone) => (zone.lat && zone.lon) || (zone.municipio_lat && zone.municipio_lon));
    if (withCoords) {
      return { 
        lat: Number(withCoords.lat ?? withCoords.municipio_lat ?? 6.2476), 
        lon: Number(withCoords.lon ?? withCoords.municipio_lon ?? -75.5658) 
      };
    }
    return { lat: 6.2476, lon: -75.5658 };
  }, [coverage]);

  // Preparamos los datos de los marcadores para pasarlos al HTML
  const markersData = useMemo(() => {
    return coverage
      .filter((zone) => zone.lat || zone.lon || zone.municipio_lat || zone.municipio_lon)
      .map((zone) => ({
        lat: Number(zone.lat ?? zone.municipio_lat),
        lon: Number(zone.lon ?? zone.municipio_lon),
        title: zone.zona_nombre || 'Zona',
        description: `${zone.total_encuestas}/${zone.meta_encuestas} (${zone.cobertura_porcentaje}%)`,
        color: coverageColors[zone.estado_cobertura] || '#6c757d'
      }));
  }, [coverage]);

  // Generamos el HTML para Leaflet
  const leafletHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { width: 100%; height: 100vh; }
        .custom-icon {
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 4px rgba(0,0,0,0.4);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([${mapCenter.lat}, ${mapCenter.lon}], 13);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        var markers = ${JSON.stringify(markersData)};

        markers.forEach(function(m) {
          // Crear un icono simple coloreado usando HTML/CSS
          var icon = L.divIcon({
            className: 'custom-icon',
            html: '<div style="background-color:' + m.color + ';width:100%;height:100%;border-radius:50%;"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          L.marker([m.lat, m.lon], { icon: icon })
            .addTo(map)
            .bindPopup('<b>' + m.title + '</b><br>' + m.description);
        });
      </script>
    </body>
    </html>
  `;

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
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Mapa de cobertura</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#1f6feb" />
        ) : (
          <View style={styles.mapContainer}>
            {/* AQUÍ ESTÁ EL CAMBIO PRINCIPAL: WEBVIEW EN LUGAR DE MAPVIEW */}
            <WebView
              originWhitelist={['*']}
              source={{ html: leafletHtml }}
              style={styles.map}
              scrollEnabled={false} // El scroll lo maneja el mapa interno
            />
          </View>
        )}
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

     

      {isAdmin && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Encuestas por municipio</Text>
          {surveysByMunicipio.length === 0 ? (
            <Text style={styles.muted}>Sin datos para mostrar.</Text>
          ) : (
            <View style={styles.chartContainer}>
              {surveysByMunicipio.map((item) => (
                <Bar
                  key={item.municipio}
                  label={item.municipio}
                  value={item.total}
                  max={surveysByMunicipio[0].total || 1}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {isAdmin && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cobertura por zona</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableHeaderText, styles.flexLarge]}>Zona</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText, styles.flexLarge]}>Municipio</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText, styles.flexSmall, styles.alignCenter]}>Meta</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText, styles.flexSmall, styles.alignCenter]}>Realizadas</Text>
            <Text style={[styles.tableCell, styles.tableHeaderText, styles.flexSmall, styles.alignCenter]}>Cobertura</Text>
          </View>

          {coverage.length === 0 ? (
            <Text style={styles.muted}>Sin datos de cobertura disponibles.</Text>
          ) : (
            coverage.map((zone) => (
              <View key={`${zone.zona}-${zone.municipio_nombre}`} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.flexLarge]} numberOfLines={1} ellipsizeMode="tail">
                  {zone.zona_nombre || zone.zona}
                </Text>
                <Text style={[styles.tableCell, styles.flexLarge]} numberOfLines={1} ellipsizeMode="tail">
                  {zone.municipio_nombre}
                </Text>
                <Text style={[styles.tableCell, styles.flexSmall, styles.alignCenter]}>{zone.meta_encuestas}</Text>
                <Text style={[styles.tableCell, styles.flexSmall, styles.alignCenter]}>{zone.total_encuestas}</Text>
                <View style={[styles.tableCell, styles.flexSmall, styles.alignCenter]}>
                  <View
                    style={[
                      styles.coveragePill,
                      {
                        backgroundColor: `${coverageColors[zone.estado_cobertura] || '#1f2937'}20`,
                        borderColor: coverageColors[zone.estado_cobertura] || '#1f2937',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.coverageText,
                        { color: coverageColors[zone.estado_cobertura] || '#1f2937' },
                      ]}
                    >
                      {zone.cobertura_porcentaje}%
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}

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

const Bar: React.FC<{ label: string; value: number; max: number }> = ({ label, value, max }) => {
  const percentage = Math.max(5, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <View style={styles.barRow}>
      <View style={[styles.bar, { width: `${percentage}%` }]}> 
        <Text style={styles.barValue}>{value}</Text>
      </View>
      <Text style={styles.barLabel} numberOfLines={1} ellipsizeMode="tail">
        {label}
      </Text>
    </View>
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
  chartContainer: {
    gap: 12,
    marginTop: 6,
  },
  barRow: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    overflow: 'hidden',
    padding: 6,
    elevation: 1,
  },
  bar: {
    backgroundColor: '#1f6feb',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: '12%',
  },
  barValue: {
    color: '#fff',
    fontWeight: '800',
  },
  barLabel: {
    marginTop: 6,
    color: '#0f172a',
    fontWeight: '700',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCell: {
    color: '#111827',
  },
  tableHeaderText: {
    fontWeight: '700',
    color: '#0f172a',
  },
  flexLarge: {
    flex: 1.4,
  },
  flexSmall: {
    flex: 0.7,
  },
  alignCenter: {
    textAlign: 'center',
  },
  coveragePill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'center',
  },
  coverageText: {
    fontWeight: '700',
  },
  listSection: { marginTop: 10 },
  listItem: { marginTop: 4, color: '#111' },
  muted: { color: '#6b7280', marginTop: 4 },
  error: { color: '#b91c1c', marginBottom: 8 },
  warning: { color: '#b45309', marginBottom: 8 },
});

export default HomeScreen;
