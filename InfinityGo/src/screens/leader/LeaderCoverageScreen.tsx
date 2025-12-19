import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { createAssignment, deleteAssignment, fetchAssignments, ZoneAssignment } from '@services/assignmentService';
import { CoverageZone, fetchCoverageZones } from '@services/dashboardService';
import { fetchMunicipios, fetchZonas, Municipio, Zona } from '@services/territoryService';
import { fetchUsersByRole, UserResponse } from '@services/userService';
import { useAuthContext } from '@store/AuthContext';

const LeaderCoverageScreen: React.FC = () => {
  const { user, signOut } = useAuthContext();
  const [collaborators, setCollaborators] = useState<UserResponse[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [zones, setZones] = useState<Zona[]>([]);
  const [assignments, setAssignments] = useState<ZoneAssignment[]>([]);
  const [coverage, setCoverage] = useState<CoverageZone[]>([]);
  const [selectedCollaborator, setSelectedCollaborator] = useState<number | null>(null);
  const [selectedMunicipio, setSelectedMunicipio] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingZones, setLoadingZones] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);

  const handleAuthError = (err: unknown) => {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) {
      signOut();
    }
  };

  const loadBaseData = async () => {
    setLoading(true);
    setError(null);
    try {
      const collaboratorRequest = fetchUsersByRole('COLABORADOR');
      const municipiosRequest = fetchMunicipios(user?.role === 'LIDER' ? user?.id : undefined);
      const [collabData, muniData, coverageData] = await Promise.all([
        collaboratorRequest,
        municipiosRequest,
        fetchCoverageZones(),
      ]);

      setCollaborators(collabData);
      setMunicipios(muniData);
      if (!selectedMunicipio && muniData.length > 0) {
        setSelectedMunicipio(muniData[0].id);
      }
      setCoverage(coverageData);
    } catch (err) {
      console.error(err);
      handleAuthError(err);
      setError('No pudimos cargar la información base.');
    } finally {
      setLoading(false);
    }
  };

  const loadZones = async (municipioId?: number | null) => {
    setLoadingZones(true);
    try {
      const data = await fetchZonas(municipioId ? { municipio: municipioId } : undefined);
      setZones(data);
    } catch (err) {
      console.error(err);
      handleAuthError(err);
      setError('No pudimos cargar las zonas disponibles.');
    } finally {
      setLoadingZones(false);
    }
  };

  const loadAssignments = async (collaboratorId?: number | null, municipioId?: number | null) => {
    if (!collaboratorId) {
      setAssignments([]);
      return;
    }
    try {
      const data = await fetchAssignments({
        colaborador: collaboratorId,
        municipio: municipioId || undefined,
      });
      setAssignments(data);
    } catch (err) {
      console.error(err);
      handleAuthError(err);
      setError('No pudimos obtener las asignaciones.');
    }
  };

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    loadZones(selectedMunicipio);
  }, [selectedMunicipio]);

  useEffect(() => {
    loadAssignments(selectedCollaborator, selectedMunicipio);
  }, [selectedCollaborator, selectedMunicipio]);

  const isAssigned = (zoneId: number) => assignments.some((a) => a.zona_id === zoneId);

  const toggleAssignment = async (zoneId: number) => {
    if (!selectedCollaborator) {
      setError('Selecciona un colaborador antes de asignar zonas.');
      return;
    }
    setSaving(true);
    setAlert(null);
    setError(null);
    try {
      const existing = assignments.find((a) => a.zona_id === zoneId);
      if (existing) {
        await deleteAssignment(existing.id);
        setAssignments((prev) => prev.filter((a) => a.id !== existing.id));
        setAlert('Asignación eliminada');
      } else {
        const created = await createAssignment({ colaborador_id: selectedCollaborator, zona_id: zoneId });
        setAssignments((prev) => [...prev, created]);
        setAlert('Zona asignada correctamente');
      }
    } catch (err) {
      console.error(err);
      handleAuthError(err);
      setError('No pudimos actualizar la asignación.');
    } finally {
      setSaving(false);
    }
  };

  const coverageSummary = useMemo(() => {
    const metaTotal = coverage.reduce((sum, z) => sum + (z.meta_encuestas || 0), 0);
    const doneTotal = coverage.reduce((sum, z) => sum + (z.total_encuestas || 0), 0);
    const completion = metaTotal > 0 ? Math.min(100, Math.round((doneTotal / metaTotal) * 100)) : 0;
    return { metaTotal, doneTotal, completion };
  }, [coverage]);

  const filteredZones = useMemo(() => {
    if (!selectedMunicipio) return zones;
    return zones.filter((zone) => zone.municipio?.id === selectedMunicipio);
  }, [zones, selectedMunicipio]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Cobertura y asignaciones</Text>
      <Text style={styles.subtitle}>Gestiona las zonas permitidas para tus colaboradores.</Text>

      {alert && <Text style={styles.success}>{alert}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      {loading && <ActivityIndicator style={styles.loading} />}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen de cobertura</Text>
        <View style={styles.summaryRow}>
          <SummaryPill label="Meta" value={coverageSummary.metaTotal} />
          <SummaryPill label="Encuestas" value={coverageSummary.doneTotal} />
          <SummaryPill label="Cumplimiento" value={`${coverageSummary.completion}%`} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Asignar zonas</Text>
        <View style={styles.selectionRow}>
          <View style={styles.selectionColumn}>
            <Text style={styles.selectionLabel}>Colaborador</Text>
            <View style={styles.selector}>
              {collaborators.map((col) => (
                <TouchableOpacity
                  key={col.id}
                  style={[styles.selectorItem, selectedCollaborator === col.id && styles.selectorItemActive]}
                  onPress={() => setSelectedCollaborator(col.id)}
                >
                  <Text style={styles.selectorTitle}>{col.name}</Text>
                  <Text style={styles.selectorSubtitle}>{col.email}</Text>
                </TouchableOpacity>
              ))}
              {!collaborators.length && <Text style={styles.muted}>Aún no tienes colaboradores creados.</Text>}
            </View>
          </View>

          <View style={styles.selectionColumn}>
            <Text style={styles.selectionLabel}>Municipio</Text>
            <View style={styles.selector}>
              {municipios.map((muni) => (
                <TouchableOpacity
                  key={muni.id}
                  style={[styles.selectorItem, selectedMunicipio === muni.id && styles.selectorItemActive]}
                  onPress={() => setSelectedMunicipio(muni.id)}
                >
                  <Text style={styles.selectorTitle}>{muni.nombre}</Text>
                </TouchableOpacity>
              ))}
              {!municipios.length && <Text style={styles.muted}>No tienes municipios asignados. Contacta a un administrador.</Text>}
            </View>
          </View>
        </View>

        {loadingZones && <ActivityIndicator />}
        {!loadingZones && filteredZones.length === 0 && (
          <Text style={styles.muted}>No hay zonas para el municipio seleccionado.</Text>
        )}

        {!loadingZones &&
          filteredZones.map((zone) => {
            const assigned = isAssigned(zone.id);
            return (
              <View key={zone.id} style={styles.zoneRow}>
                <View>
                  <Text style={styles.zoneTitle}>{zone.nombre}</Text>
                  <Text style={styles.zoneSubtitle}>{zone.municipio?.nombre || 'Sin municipio'}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.assignButton, assigned && styles.assignedButton]}
                  onPress={() => toggleAssignment(zone.id)}
                  disabled={saving}
                >
                  <Ionicons
                    name={assigned ? 'checkmark-done-outline' : 'add-circle-outline'}
                    size={18}
                    color={assigned ? '#16a34a' : '#0f172a'}
                  />
                  <Text style={styles.assignButtonText}>{assigned ? 'Asignada' : 'Asignar'}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Zonas asignadas</Text>
          <Text style={styles.badge}>{assignments.length}</Text>
        </View>
        {!selectedCollaborator && <Text style={styles.muted}>Selecciona un colaborador para ver sus asignaciones.</Text>}
        {selectedCollaborator && assignments.length === 0 && (
          <Text style={styles.muted}>No hay asignaciones para este colaborador.</Text>
        )}
        {assignments.map((assignment) => (
          <View key={assignment.id} style={styles.assignmentRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.zoneTitle}>{assignment.zona_nombre}</Text>
              <Text style={styles.zoneSubtitle}>{assignment.municipio_nombre}</Text>
            </View>
            <TouchableOpacity
              style={[styles.assignButton, styles.dangerButton]}
              onPress={() => toggleAssignment(assignment.zona_id)}
              disabled={saving}
            >
              <Ionicons name="trash-outline" size={18} color="#b91c1c" />
              <Text style={[styles.assignButtonText, { color: '#b91c1c' }]}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const SummaryPill: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <View style={styles.pill}>
    <Text style={styles.pillLabel}>{label}</Text>
    <Text style={styles.pillValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { color: '#475569', marginTop: 4, marginBottom: 12 },
  loading: { marginVertical: 8 },
  error: { color: '#b91c1c', marginBottom: 8 },
  success: { color: '#16a34a', marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    minWidth: '30%',
  },
  pillLabel: { color: '#475569' },
  pillValue: { fontWeight: '800', color: '#0f172a', marginTop: 4 },
  selectionRow: { flexDirection: 'row', gap: 12 },
  selectionColumn: { flex: 1 },
  selectionLabel: { color: '#475569', marginBottom: 6 },
  selector: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 8,
    gap: 6,
  },
  selectorItem: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  selectorItemActive: {
    borderColor: '#1f6feb',
    backgroundColor: '#eff6ff',
  },
  selectorTitle: { fontWeight: '700', color: '#0f172a' },
  selectorSubtitle: { color: '#475569', marginTop: 2 },
  muted: { color: '#94a3b8' },
  zoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  zoneTitle: { fontWeight: '700', color: '#0f172a' },
  zoneSubtitle: { color: '#475569', marginTop: 2 },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  assignedButton: { borderColor: '#16a34a', backgroundColor: '#dcfce7' },
  dangerButton: { borderColor: '#fecdd3', backgroundColor: '#fff1f2' },
  assignButtonText: { color: '#0f172a', fontWeight: '700' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#e2e8f0',
    color: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontWeight: '700',
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
});

export default LeaderCoverageScreen;
