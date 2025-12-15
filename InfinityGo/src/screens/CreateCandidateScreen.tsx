import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Candidate, CandidatePayload, createCandidate, fetchCandidates, updateCandidate } from '@services/candidateService';
import { useAuthContext } from '@store/AuthContext';

const emptyForm: CandidatePayload & { password?: string } = {
  nombre: '',
  cargo: '',
  partido: '',
  email: '',
  password: '',
};

const CreateCandidateScreen: React.FC = () => {
  const { user } = useAuthContext();
  const [form, setForm] = useState(emptyForm);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<string | null>(null);

  const loadCandidates = async () => {
    if (user?.role !== 'ADMIN') return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCandidates();
      setCandidates(data);
    } catch (err) {
      console.error(err);
      setError('No pudimos cargar los candidatos existentes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const handleSubmit = async () => {
    if (user?.role !== 'ADMIN') return;
    if (!form.nombre.trim() || !form.cargo.trim() || !form.partido.trim() || !form.email.trim()) {
      setError('Nombre, cargo, partido y correo son obligatorios.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    setCredentials(null);

    try {
      if (editingId) {
        await updateCandidate(editingId, {
          nombre: form.nombre.trim(),
          cargo: form.cargo.trim(),
          partido: form.partido.trim(),
          email: form.email.trim(),
          password: form.password || undefined,
        });
        setMessage('Candidato actualizado correctamente.');
      } else {
        const data = await createCandidate({
          nombre: form.nombre.trim(),
          cargo: form.cargo.trim(),
          partido: form.partido.trim(),
          email: form.email.trim(),
          password: form.password || undefined,
        });
        setMessage('Candidato guardado correctamente.');
        if (data.generated_password) {
          setCredentials(`Credenciales: ${data.usuario_email} / ${data.generated_password}`);
        }
      }
      setEditingId(null);
      setForm(emptyForm);
      loadCandidates();
    } catch (err) {
      console.error(err);
      setError('No pudimos guardar el candidato. Revisa los datos.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (candidate: Candidate) => {
    setEditingId(candidate.id);
    setForm({
      nombre: candidate.nombre,
      cargo: candidate.cargo,
      partido: candidate.partido,
      email: candidate.usuario_email,
      password: '',
    });
    setMessage(null);
    setError(null);
    setCredentials(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setMessage(null);
    setError(null);
    setCredentials(null);
  };

  if (user?.role !== 'ADMIN') {
    return (
      <View style={styles.centered}>
        <Text style={styles.warning}>Solo los administradores pueden crear candidatos.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Crear candidato</Text>
      <Text style={styles.subtitle}>Crea candidatos con sus credenciales de acceso.</Text>

      {error && <Text style={styles.error}>{error}</Text>}
      {message && <Text style={styles.success}>{message}</Text>}
      {credentials && <Text style={styles.note}>{credentials}</Text>}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Información del candidato</Text>
        <TextInput
          placeholder="Nombre completo"
          value={form.nombre}
          onChangeText={(text) => setForm((prev) => ({ ...prev, nombre: text }))}
          style={styles.input}
          autoCapitalize="words"
        />
        <TextInput
          placeholder="Cargo"
          value={form.cargo}
          onChangeText={(text) => setForm((prev) => ({ ...prev, cargo: text }))}
          style={styles.input}
        />
        <TextInput
          placeholder="Partido"
          value={form.partido}
          onChangeText={(text) => setForm((prev) => ({ ...prev, partido: text }))}
          style={styles.input}
        />
        <TextInput
          placeholder="Correo"
          value={form.email}
          onChangeText={(text) => setForm((prev) => ({ ...prev, email: text }))}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          placeholder="Contraseña (opcional)"
          value={form.password}
          onChangeText={(text) => setForm((prev) => ({ ...prev, password: text }))}
          style={styles.input}
          secureTextEntry
        />
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={saving}>
        <Text style={styles.primaryButtonText}>{saving ? 'Guardando...' : editingId ? 'Actualizar candidato' : 'Guardar candidato'}</Text>
      </TouchableOpacity>

      {editingId && (
        <TouchableOpacity style={[styles.secondaryButton]} onPress={cancelEdit} disabled={saving}>
          <Text style={styles.secondaryButtonText}>Cancelar edición</Text>
        </TouchableOpacity>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Candidatos registrados</Text>
        {loading && <Text style={styles.muted}>Cargando candidatos...</Text>}
        {!loading && candidates.length === 0 && <Text style={styles.muted}>Aún no hay candidatos.</Text>}
        {!loading &&
          candidates.map((candidate) => (
            <TouchableOpacity key={candidate.id} style={styles.listItem} onPress={() => startEdit(candidate)}>
              <View>
                <Text style={styles.listTitle}>{candidate.nombre}</Text>
                <Text style={styles.listSubtitle}>
                  {candidate.cargo} · {candidate.partido}
                </Text>
                <Text style={styles.listSubtitle}>{candidate.usuario_email}</Text>
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
  primaryButton: {
    backgroundColor: '#1f6feb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: '#b91c1c', marginBottom: 8 },
  success: { color: '#16a34a', marginBottom: 8 },
  note: { color: '#0f172a', marginBottom: 8, fontWeight: '600' },
  warning: { color: '#b45309', textAlign: 'center', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  muted: { color: '#94a3b8' },
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

export default CreateCandidateScreen;
