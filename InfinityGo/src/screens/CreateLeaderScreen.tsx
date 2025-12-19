import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { fetchMunicipios, Municipio } from '@services/territoryService';
import { assignMunicipiosToUser, createUser, fetchUsersByRole, updateLeaderMeta, updateUser, UserResponse } from '@services/userService';
import { useAuthContext } from '@store/AuthContext';

const initialForm = {
  name: '',
  email: '',
  telefono: '',
  cedula: '',
  password: '',
};

const CreateLeaderScreen: React.FC = () => {
  const { user } = useAuthContext();
  const [form, setForm] = useState(initialForm);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [selectedMunicipios, setSelectedMunicipios] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [leaders, setLeaders] = useState<UserResponse[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [metaVotantes, setMetaVotantes] = useState('');

  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const data = await fetchMunicipios();
        setMunicipios(data);
      } catch (err) {
        console.error(err);
        setError('No pudimos cargar los municipios disponibles.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const loadLeaders = async () => {
      if (user?.role !== 'ADMIN') return;
      setListLoading(true);
      try {
        const data = await fetchUsersByRole('LIDER');
        setLeaders(data);
      } catch (err) {
        console.error(err);
        setError('No pudimos cargar los líderes existentes.');
      } finally {
        setListLoading(false);
      }
    };

    loadLeaders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const toggleMunicipio = (id: number) => {
    setSelectedMunicipios((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    if (user?.role !== 'ADMIN') return;
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Nombre, correo y contraseña son obligatorios.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      if (editingId) {
        const updated = await updateUser(editingId, {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password || undefined,
          role: 'LIDER',
          telefono: form.telefono || undefined,
          cedula: form.cedula || undefined,
          is_active: true,
        });

        if (selectedMunicipios.length > 0) {
          await assignMunicipiosToUser(updated.id, selectedMunicipios);
        }
        if (metaVotantes.trim()) {
          await updateLeaderMeta(updated.id, Number(metaVotantes));
        }
        setMessage('Líder actualizado correctamente.');
      } else {
        const created = await createUser({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: 'LIDER',
          telefono: form.telefono || undefined,
          cedula: form.cedula || undefined,
          is_active: true,
        });

        if (selectedMunicipios.length > 0) {
          await assignMunicipiosToUser(created.id, selectedMunicipios);
        }
        if (metaVotantes.trim()) {
          await updateLeaderMeta(created.id, Number(metaVotantes));
        }

        setMessage('Líder creado correctamente.');
      }

      setForm(initialForm);
      setSelectedMunicipios([]);
      setMetaVotantes('');
      setEditingId(null);
      setError(null);
      const data = await fetchUsersByRole('LIDER');
      setLeaders(data);
    } catch (err) {
      console.error(err);
      setError('No pudimos guardar el líder. Revisa los datos.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (leader: UserResponse) => {
    setEditingId(leader.id);
    setForm({
      name: leader.name,
      email: leader.email,
      telefono: leader.telefono || '',
      cedula: leader.cedula || '',
      password: '',
    });
    setSelectedMunicipios([]);
    setMetaVotantes(leader.meta_votantes?.toString() ?? '');
    setMessage(null);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(initialForm);
    setSelectedMunicipios([]);
    setMetaVotantes('');
    setMessage(null);
    setError(null);
  };

  if (user?.role !== 'ADMIN') {
    return (
      <View style={styles.centered}>
        <Text style={styles.warning}>Solo los administradores pueden crear líderes.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Crear líder</Text>
      <Text style={styles.subtitle}>Registra líderes y asigna municipios disponibles.</Text>

      {loading && <ActivityIndicator style={styles.spacing} />}
      {error && <Text style={styles.error}>{error}</Text>}
      {message && <Text style={styles.success}>{message}</Text>}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Datos básicos</Text>
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
        <TextInput
          placeholder="Contraseña"
          value={form.password}
          onChangeText={(text) => setForm((prev) => ({ ...prev, password: text }))}
          style={styles.input}
          secureTextEntry
        />
        <TextInput
          placeholder="Meta de votantes"
          value={metaVotantes}
          onChangeText={(text) => setMetaVotantes(text.replace(/[^0-9]/g, ''))}
          style={styles.input}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Municipios asignados</Text>
        {municipios.length === 0 && <Text style={styles.muted}>No hay municipios disponibles.</Text>}
        <View style={styles.chipContainer}>
          {municipios.map((municipio) => (
            <TouchableOpacity
              key={municipio.id}
              style={[styles.chip, selectedMunicipios.includes(municipio.id) && styles.chipSelected]}
              onPress={() => toggleMunicipio(municipio.id)}
            >
              <Text style={selectedMunicipios.includes(municipio.id) ? styles.chipTextSelected : styles.chipText}>
                {municipio.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.helper}>Selecciona uno o varios municipios para el líder.</Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={saving}>
        <Text style={styles.primaryButtonText}>{saving ? 'Guardando...' : editingId ? 'Actualizar líder' : 'Guardar líder'}</Text>
      </TouchableOpacity>

      {editingId && (
        <TouchableOpacity style={styles.secondaryButton} onPress={cancelEdit} disabled={saving}>
          <Text style={styles.secondaryButtonText}>Cancelar edición</Text>
        </TouchableOpacity>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Líderes existentes</Text>
        {listLoading && <Text style={styles.muted}>Cargando líderes...</Text>}
        {!listLoading && leaders.length === 0 && <Text style={styles.muted}>Aún no hay líderes registrados.</Text>}
        {!listLoading &&
          leaders.map((leader) => (
            <TouchableOpacity key={leader.id} style={styles.listItem} onPress={() => startEdit(leader)}>
              <View>
                <Text style={styles.listTitle}>{leader.name}</Text>
                <Text style={styles.listSubtitle}>{leader.email}</Text>
                {leader.telefono ? <Text style={styles.listSubtitle}>{leader.telefono}</Text> : null}
                <Text style={styles.listSubtitle}>Meta votantes: {leader.meta_votantes ?? 0}</Text>
              </View>
              <Text style={styles.editTag}>Editar</Text>
            </TouchableOpacity>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, color: '#0f172a' },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
  },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginBottom: 8,
  },
  chipSelected: { backgroundColor: '#1f6feb', borderColor: '#1f6feb' },
  chipText: { color: '#0f172a' },
  chipTextSelected: { color: '#fff', fontWeight: '700' },
  helper: { color: '#64748b', marginTop: 6 },
  primaryButton: {
    backgroundColor: '#1f6feb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  muted: { color: '#94a3b8' },
  error: { color: '#b91c1c', marginBottom: 8 },
  success: { color: '#16a34a', marginBottom: 8 },
  warning: { color: '#b45309', textAlign: 'center', padding: 16 },
  spacing: { marginVertical: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  listItem: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  listSubtitle: { color: '#475569' },
  editTag: { color: '#1f6feb', fontWeight: '700' },
  secondaryButton: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  secondaryButtonText: { color: '#0f172a', fontWeight: '700' },
});

export default CreateLeaderScreen;
