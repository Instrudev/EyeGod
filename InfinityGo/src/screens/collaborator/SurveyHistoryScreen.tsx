import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AndroidEvent, DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { fetchSurveys, SurveyRow } from '@services/surveyService';
import { filterSurveysByDate } from '@services/collaboratorService';
import { useAuthContext } from '@store/AuthContext';

const SurveyHistoryScreen: React.FC = () => {
  const { user } = useAuthContext();
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [filtered, setFiltered] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const isCollaborator = (user?.role || '').toUpperCase() === 'COLABORADOR';

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchSurveys();
      setSurveys(data);
      setFiltered(filterSurveysByDate(data, startDate, endDate));
    } catch (loadError) {
      console.error(loadError);
      setError('No pudimos cargar tu historial de encuestas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  useEffect(() => {
    setFiltered(filterSurveysByDate(surveys, startDate, endDate));
  }, [startDate, endDate, surveys]);

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

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (!isCollaborator) {
    return (
      <View style={styles.centered}>
        <Text style={styles.warning}>Este historial está disponible para colaboradores.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Historial de encuestas</Text>
      <Text style={styles.subtitle}>Consulta las encuestas registradas con filtro por fechas.</Text>

      {error && <Text style={styles.error}>{error}</Text>}
      {loading && <ActivityIndicator style={styles.loading} />}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Filtro por rango</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker('start')}>
            <Text style={styles.dateLabel}>Fecha inicio</Text>
            <Text style={styles.dateValue}>{startDate ? startDate.toISOString().split('T')[0] : 'Selecciona'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker('end')}>
            <Text style={styles.dateLabel}>Fecha fin</Text>
            <Text style={styles.dateValue}>{endDate ? endDate.toISOString().split('T')[0] : 'Selecciona'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Encuestas</Text>
        {loading && <Text style={styles.muted}>Cargando encuestas...</Text>}
        {!loading && filtered.length === 0 && <Text style={styles.muted}>Aún no tienes encuestas registradas.</Text>}
        {!loading &&
          filtered.map((survey) => (
            <View key={survey.id} style={styles.listItem}>
              <View style={styles.listMeta}>
                <Text style={styles.listTitle}>Encuesta #{survey.id}</Text>
                <Text style={styles.listSubtitle}>{new Date(survey.fecha_creacion).toLocaleDateString()}</Text>
              </View>
              <View style={styles.listContext}>
                {survey.municipio_nombre && <Text style={styles.listSubtitle}>{survey.municipio_nombre}</Text>}
                {survey.zona_nombre && <Text style={styles.listSubtitle}>{survey.zona_nombre}</Text>}
                {survey.estado && <Text style={styles.statusTag}>{survey.estado}</Text>}
              </View>
            </View>
          ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { color: '#475569', marginTop: 4, marginBottom: 12 },
  loading: { marginVertical: 8 },
  error: { color: '#b91c1c', marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#0f172a' },
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
  muted: { color: '#6b7280', marginTop: 4 },
  listItem: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  listMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  listSubtitle: { color: '#475569', marginTop: 2 },
  listContext: { marginTop: 4 },
  statusTag: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    fontWeight: '700',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  warning: { color: '#b45309', textAlign: 'center' },
});

export default SurveyHistoryScreen;
