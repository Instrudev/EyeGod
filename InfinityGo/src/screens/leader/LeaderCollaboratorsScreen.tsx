import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { fetchAssignments, ZoneAssignment } from '@services/assignmentService';
import { CollaboratorProgress, fetchCollaboratorProgress } from '@services/dashboardService';
import { createUser, fetchUsersByRole, updateUser, UserResponse } from '@services/userService';
import { useAuthContext } from '@store/AuthContext';

interface CollaboratorForm {
  name: string;
  email: string;
  telefono: string;
  cedula: string;
  password: string;
  is_active: boolean;
}

const initialForm: CollaboratorForm = {
  name: '',
  email: '',
  telefono: '',
  cedula: '',
  password: '',
  is_active: true,
};

const LeaderCollaboratorsScreen: React.FC = () => {
  const { signOut } = useAuthContext();
  const [form, setForm] = useState<CollaboratorForm>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [collaborators, setCollaborators] = useState<UserResponse[]>([]);
  const [assignments, setAssignments] = useState<ZoneAssignment[]>([]);
  const [progress, setProgress] = useState<CollaboratorProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);

  const handleAuthError = (err: unknown) => {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) {
      signOut();
    }
  };

  const loadData = async (fromRefresh = false) => {
    if (fromRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const [collabData, assignmentData, progressData] = await Promise.all([
        fetchUsersByRole('COLABORADOR'),
        fetchAssignments(),
        fetchCollaboratorProgress(),
      ]);
      setCollaborators(collabData);
      setAssignments(assignmentData);
      setProgress(progressData);
    } catch (err) {
      console.error(err);
      handleAuthError(err);
      setError('No pudimos cargar tus colaboradores.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const zonesByCollaborator = useMemo(() => {
    const map: Record<number, string[]> = {};
    assignments.forEach((assignment) => {
      if (!assignment.colaborador_id) return;
      const label = `${assignment.municipio_nombre} - ${assignment.zona_nombre}`;
      map[assignment.colaborador_id] = [...(map[assignment.colaborador_id] || []), label];
    });
    return map;
  }, [assignments]);

  const progressByCollaborator = useMemo(() => {
    const map: Record<number, CollaboratorProgress> = {};
    progress.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [progress]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || (!editingId && !form.password.trim())) {
      setError('Nombre, correo y contraseña son obligatorios.');
      return;
    }

    setSaving(true);
    setAlert(null);
    setError(null);

    try {
      if (editingId) {
        const payload: Partial<CollaboratorForm> & { role: 'COLABORADOR' } = {
          ...form,
          role: 'COLABORADOR',
        };
        if (!payload.password) {
          delete payload.password;
        }
        await updateUser(editingId, payload);
        setAlert('Colaborador actualizado correctamente.');
      } else {
        await createUser({ ...form, role: 'COLABORADOR' });
        setAlert('Colaborador creado correctamente.');
      }
      setForm(initialForm);
      setEditingId(null);
      await loadData();
    } catch (err) {
      console.error(err);
      handleAuthError(err);
      setError('No pudimos guardar el colaborador.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (collaborator: UserResponse) => {
    setEditingId(collaborator.id);
    setForm({
      name: collaborator.name,
      email: collaborator.email,
      telefono: collaborator.telefono || '',
      cedula: collaborator.cedula || '',
      password: '',
      is_active: collaborator.is_active,
    });
    setAlert(null);
    setError(null);
  };

  const confirmToggleActive = (collaborator: UserResponse) => {
    Alert.alert(
      collaborator.is_active ? 'Desactivar colaborador' : 'Activar colaborador',
      collaborator.is_active
        ? 'Este colaborador no podrá iniciar sesión hasta que lo actives nuevamente.'
        : 'El colaborador podrá iniciar sesión y registrar encuestas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: collaborator.is_active ? 'Desactivar' : 'Activar',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateUser(collaborator.id, {
                is_active: !collaborator.is_active,
                role: 'COLABORADOR',
              });
              await loadData();
            } catch (err) {
              console.error(err);
              handleAuthError(err);
              setError('No pudimos actualizar el estado del colaborador.');
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Mis colaboradores</Text>
      <Text style={styles.subtitle}>Crea colaboradores y administra su estado sin salir del panel.</Text>

      {alert && <Text style={styles.success}>{alert}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
      {loading && <ActivityIndicator style={styles.loading} />}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{editingId ? 'Editar colaborador' : 'Crear colaborador'}</Text>
        <View style={styles.formRow}>
          <TextInput
            placeholder="Nombre completo"
            value={form.name}
            onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
            style={styles.input}
            autoCapitalize="words"
          />
          <TextInput
            placeholder="Correo"
            value={form.email}
            onChangeText={(text) => setForm((prev) => ({ ...prev, email: text }))}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.formRow}>
          <TextInput
            placeholder="Teléfono"
            value={form.telefono}
            onChangeText={(text) => setForm((prev) => ({ ...prev, telefono: text }))}
            style={styles.input}
            keyboardType="phone-pad"
          />
          <TextInput
            placeholder="Cédula"
            value={form.cedula}
            onChangeText={(text) => setForm((prev) => ({ ...prev, cedula: text }))}
            style={styles.input}
          />
        </View>
        <TextInput
          placeholder={editingId ? 'Dejar en blanco para mantener la contraseña' : 'Contraseña'}
          value={form.password}
          onChangeText={(text) => setForm((prev) => ({ ...prev, password: text }))}
          style={styles.input}
          secureTextEntry
        />
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.primaryButton, saving && styles.disabledButton]} onPress={handleSubmit} disabled={saving}>
            <Ionicons name="save" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>{editingId ? 'Actualizar' : 'Crear'}</Text>
          </TouchableOpacity>
          {editingId && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setForm(initialForm);
                setEditingId(null);
              }}
            >
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Colaboradores registrados</Text>
          <Text style={styles.badge}>{collaborators.length}</Text>
        </View>

        {loading && <ActivityIndicator />}
        {!loading && collaborators.length === 0 && <Text style={styles.muted}>Aún no has creado colaboradores.</Text>}

        {!loading &&
          collaborators.map((collaborator) => {
            const assignedZones = zonesByCollaborator[collaborator.id] || [];
            const progressRow = progressByCollaborator[collaborator.id];
            const goal = progressRow?.meta_encuestas || 0;
            const done = progressRow?.encuestas_realizadas || 0;
            const percentage = goal > 0 ? Math.min(100, Math.round((done / goal) * 100)) : 0;

            return (
              <View key={collaborator.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{collaborator.name}</Text>
                  <Text style={styles.listSubtitle}>{collaborator.email}</Text>
                  <Text style={styles.listMuted}>{assignedZones.length ? assignedZones.join(', ') : 'Sin zonas asignadas'}</Text>
                  <Text style={styles.listMuted}>
                    Encuestas: {done}/{goal} ({percentage}%)
                  </Text>
                </View>
                <View style={styles.rowActions}>
                  <TouchableOpacity style={styles.iconButton} onPress={() => startEdit(collaborator)}>
                    <Ionicons name="create-outline" size={18} color="#1f6feb" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconButton} onPress={() => confirmToggleActive(collaborator)}>
                    <Ionicons
                      name={collaborator.is_active ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={collaborator.is_active ? '#b91c1c' : '#16a34a'}
                    />
                  </TouchableOpacity>
                  <Text style={[styles.statusBadge, collaborator.is_active ? styles.statusActive : styles.statusInactive]}>
                    {collaborator.is_active ? 'Activo' : 'Inactivo'}
                  </Text>
                </View>
              </View>
            );
          })}
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
  formRow: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1f6feb',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  disabledButton: { opacity: 0.7 },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  secondaryButtonText: { color: '#0f172a', fontWeight: '700' },
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
  muted: { color: '#64748b' },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  listTitle: { fontWeight: '700', color: '#0f172a' },
  listSubtitle: { color: '#475569', marginTop: 2 },
  listMuted: { color: '#94a3b8', marginTop: 2 },
  rowActions: { alignItems: 'flex-end', gap: 6 },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  statusActive: { backgroundColor: '#dcfce7' },
  statusInactive: { backgroundColor: '#e2e8f0' },
});

export default LeaderCollaboratorsScreen;
