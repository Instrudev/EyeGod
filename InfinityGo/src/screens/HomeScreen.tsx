import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '@hooks/useAuth';
import { DashboardSummary, fetchDashboardSummary } from '@services/dashboardService';

const HomeScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchDashboardSummary();
      setSummary(response);
    } catch (fetchError) {
      const message =
        (fetchError as { response?: { data?: { detail?: string } } }).response?.data?.detail ||
        'No se pudo cargar el tablero.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSummary} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Hola, {user?.name ?? 'Equipo'} 👋</Text>
          <Text style={styles.sub}>Rol: {user?.role ?? 'Invitado'}</Text>
        </View>
        <TouchableOpacity style={styles.logout} onPress={signOut}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator />}
      {error && <Text style={styles.error}>{error}</Text>}

      {summary && !loading ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumen de campo</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Encuestas realizadas</Text>
            <Text style={styles.value}>{summary.total_encuestas}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Zonas cumplidas</Text>
            <Text style={styles.value}>{summary.zonas_cumplidas}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Zonas sin cobertura</Text>
            <Text style={styles.value}>{summary.zonas_sin_cobertura}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Casos activos</Text>
            <Text style={styles.value}>{summary.casos_activos}</Text>
          </View>

          <Text style={[styles.label, styles.sectionTitle]}>Top necesidades</Text>
          {summary.top_necesidades?.length ? (
            summary.top_necesidades.map((item, index) => (
              <View key={`${item.necesidad__nombre}-${index}`} style={styles.row}>
                <Text style={styles.label}>{item.necesidad__nombre}</Text>
                <Text style={styles.value}>{item.total}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>Sin datos de necesidades</Text>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcome: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '700',
  },
  sub: {
    color: '#cbd5e1',
  },
  logout: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  logoutText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#cbd5e1',
  },
  value: {
    color: '#22d3ee',
    fontWeight: '700',
  },
  sectionTitle: {
    marginTop: 6,
    marginBottom: 4,
  },
  empty: {
    color: '#cbd5e1',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  error: {
    color: '#f87171',
    marginBottom: 12,
  },
});

export default HomeScreen;
