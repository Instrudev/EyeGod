import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  createSurvey,
  fetchNeeds,
  fetchSurveyDetail,
  fetchSurveys,
  Need,
  SurveyDetail,
  SurveyRow,
  updateSurvey,
} from '@services/surveyService';
import { fetchMunicipios, fetchZonas, Municipio, Zona } from '@services/territoryService';
import { useAuthContext } from '@store/AuthContext';

const viviendaOptions = [
  { value: 'PROPIA', label: 'Propia' },
  { value: 'ARRIENDO', label: 'Arriendo' },
  { value: 'FAMILIAR', label: 'Familiar' },
  { value: 'OTRO', label: 'Otro' },
];

const edadOptions = [
  { value: '14-25', label: '14-25' },
  { value: '26-40', label: '26-40' },
  { value: '41-60', label: '41-60' },
  { value: '60+', label: '60+' },
];

const ocupacionOptions = [
  { value: 'ESTUDIANTE', label: 'Estudiante' },
  { value: 'EMPLEADO', label: 'Empleado' },
  { value: 'INDEPENDIENTE', label: 'Independiente' },
  { value: 'DESEMPLEADO', label: 'Desempleado' },
  { value: 'AGRICULTOR', label: 'Agricultor' },
  { value: 'OTRO', label: 'Otro' },
];

const afinidadOptions = [
  { value: '1', label: 'Totalmente de acuerdo' },
  { value: '2', label: 'De acuerdo' },
  { value: '3', label: 'Indeciso' },
  { value: '4', label: 'En desacuerdo' },
  { value: '5', label: 'Totalmente en desacuerdo' },
];

const disposicionOptions = [
  { value: '1', label: 'Seguro vota' },
  { value: '2', label: 'Tal vez vota' },
  { value: '3', label: 'No vota' },
];

const influenciaOptions = [
  { value: '0', label: 'Ninguna' },
  { value: '1', label: '1-2 personas' },
  { value: '2', label: '3-5 personas' },
  { value: '3', label: 'Más de 5 personas' },
];

const CreateSurveyScreen: React.FC = () => {
  const { user } = useAuthContext();
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [selectedMunicipio, setSelectedMunicipio] = useState<number | null>(null);
  const [selectedNeeds, setSelectedNeeds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [surveys, setSurveys] = useState<SurveyRow[]>([]);
  const [editingSurveyId, setEditingSurveyId] = useState<number | null>(null);
  const [form, setForm] = useState({
    zonaId: '',
    nombre: '',
    cedula: '',
    telefono: '',
    tipoVivienda: viviendaOptions[0].value,
    rangoEdad: edadOptions[0].value,
    ocupacion: ocupacionOptions[0].value,
    nivelAfinidad: '',
    disposicionVoto: '',
    capacidadInfluencia: '',
    tieneNinos: false,
    tieneAdultosMayores: false,
    tieneDiscapacidad: false,
    comentario: '',
    consentimiento: false,
    casoCritico: false,
    lat: '',
    lon: '',
  });

  useEffect(() => {
    const load = async () => {
      setError(null);
      setLoading(true);
      try {
        const [municipioData, zonaData, needData] = await Promise.all([
          fetchMunicipios(),
          fetchZonas(),
          fetchNeeds(),
        ]);
        setMunicipios(municipioData);
        setZonas(zonaData);
        setNeeds(needData);
      } catch (err) {
        console.error(err);
        setError('No pudimos cargar la información base para la encuesta.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const loadSurveys = async () => {
      if (user?.role !== 'ADMIN') return;
      setListLoading(true);
      try {
        const data = await fetchSurveys();
        setSurveys(data);
      } catch (err) {
        console.error(err);
        setError('No pudimos cargar las encuestas existentes.');
      } finally {
        setListLoading(false);
      }
    };

    loadSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const filteredZonas = useMemo(() => {
    if (!selectedMunicipio) return zonas;
    return zonas.filter((zona) => zona.municipio?.id === selectedMunicipio);
  }, [selectedMunicipio, zonas]);

  const toggleNeed = (id: number) => {
    setSelectedNeeds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleSubmit = async () => {
    if (user?.role !== 'ADMIN') return;
    if (!form.zonaId) {
      setError('Selecciona una zona para registrar la encuesta.');
      return;
    }
    if (!form.nombre.trim()) {
      setError('El campo nombre_del_ciudadano es obligatorio.');
      return;
    }
    if (!form.telefono.trim()) {
      setError('El campo telefono es obligatorio.');
      return;
    }
    if (!form.consentimiento) {
      setError('Debes contar con consentimiento informado.');
      return;
    }
    if (!/^\d{1,15}$/.test(form.cedula)) {
      setError('La cédula es obligatoria y solo admite números (máx. 15).');
      return;
    }
    if (!form.nivelAfinidad || !form.disposicionVoto || form.capacidadInfluencia === '') {
      setError('Selecciona afinidad, disposición de voto y capacidad de influencia.');
      return;
    }
    if (selectedNeeds.length === 0) {
      setError('Selecciona al menos una necesidad (máximo 3).');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        zona: Number(form.zonaId),
        nombre_ciudadano: form.nombre || null,
        cedula: form.cedula,
        telefono: form.telefono || null,
        tipo_vivienda: form.tipoVivienda,
        rango_edad: form.rangoEdad,
        ocupacion: form.ocupacion,
        tiene_ninos: form.tieneNinos,
        tiene_adultos_mayores: form.tieneAdultosMayores,
        tiene_personas_con_discapacidad: form.tieneDiscapacidad,
        comentario_problema: form.comentario || null,
        consentimiento: form.consentimiento,
        caso_critico: form.casoCritico,
        nivel_afinidad: Number(form.nivelAfinidad),
        disposicion_voto: Number(form.disposicionVoto),
        capacidad_influencia: Number(form.capacidadInfluencia),
        lat: form.lat ? Number(form.lat) : null,
        lon: form.lon ? Number(form.lon) : null,
        necesidades: selectedNeeds.map((needId, index) => ({ prioridad: index + 1, necesidad_id: needId })),
      };

      if (editingSurveyId) {
        await updateSurvey(editingSurveyId, payload);
        setMessage('Encuesta actualizada correctamente.');
      } else {
        await createSurvey(payload);
        setMessage('Encuesta registrada con éxito.');
      }
      setSelectedNeeds([]);
      setForm((prev) => ({
        ...prev,
        zonaId: '',
        nombre: '',
        cedula: '',
        telefono: '',
        tieneNinos: false,
        tieneAdultosMayores: false,
        tieneDiscapacidad: false,
        comentario: '',
        consentimiento: false,
        casoCritico: false,
        nivelAfinidad: '',
        disposicionVoto: '',
        capacidadInfluencia: '',
        lat: '',
        lon: '',
      }));
      setEditingSurveyId(null);
      const data = await fetchSurveys();
      setSurveys(data);
    } catch (err) {
      console.error(err);
      setError('No pudimos guardar la encuesta. Revisa los datos enviados.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = async (surveyId: number) => {
    setEditingSurveyId(surveyId);
    setMessage(null);
    setError(null);
    setDetailLoading(true);
    try {
      const detail: SurveyDetail = await fetchSurveyDetail(surveyId);
      const zone = zonas.find((z) => z.id === detail.zona);
      setSelectedMunicipio(zone?.municipio?.id ?? null);
      setSelectedNeeds(detail.necesidades.map((need) => need.necesidad_id));
      setForm({
        zonaId: String(detail.zona),
        nombre: detail.nombre_ciudadano || '',
        cedula: detail.cedula || '',
        telefono: detail.telefono || '',
        tipoVivienda: detail.tipo_vivienda,
        rangoEdad: detail.rango_edad,
        ocupacion: detail.ocupacion,
        nivelAfinidad: detail.nivel_afinidad ? String(detail.nivel_afinidad) : '',
        disposicionVoto: detail.disposicion_voto ? String(detail.disposicion_voto) : '',
        capacidadInfluencia: detail.capacidad_influencia ? String(detail.capacidad_influencia) : '',
        tieneNinos: detail.tiene_ninos,
        tieneAdultosMayores: detail.tiene_adultos_mayores,
        tieneDiscapacidad: detail.tiene_personas_con_discapacidad,
        comentario: detail.comentario_problema || '',
        consentimiento: detail.consentimiento,
        casoCritico: detail.caso_critico,
        lat: detail.lat ? String(detail.lat) : '',
        lon: detail.lon ? String(detail.lon) : '',
      });
    } catch (err) {
      console.error(err);
      setError('No pudimos cargar el detalle de la encuesta seleccionada.');
    } finally {
      setDetailLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingSurveyId(null);
    setMessage(null);
    setError(null);
    setSelectedNeeds([]);
    setForm((prev) => ({
      ...prev,
      zonaId: '',
      nombre: '',
      cedula: '',
      telefono: '',
      tieneNinos: false,
      tieneAdultosMayores: false,
      tieneDiscapacidad: false,
      comentario: '',
      consentimiento: false,
      casoCritico: false,
      nivelAfinidad: '',
      disposicionVoto: '',
      capacidadInfluencia: '',
      lat: '',
      lon: '',
    }));
  };

  if (user?.role !== 'ADMIN') {
    return (
      <View style={styles.centered}>
        <Text style={styles.warning}>Solo los administradores pueden registrar encuestas aquí.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Crear encuesta</Text>
      <Text style={styles.subtitle}>Replica el formulario territorial con una experiencia móvil.</Text>

      {loading && <ActivityIndicator style={styles.spacing} />}
      {error && <Text style={styles.error}>{error}</Text>}
      {message && <Text style={styles.success}>{message}</Text>}
      {detailLoading && <Text style={styles.info}>Cargando encuesta seleccionada...</Text>}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ubicación y zona</Text>
        <Text style={styles.label}>Municipio</Text>
        <View style={styles.chipContainer}>
          {municipios.map((municipio) => (
            <TouchableOpacity
              key={municipio.id}
              style={[styles.chip, selectedMunicipio === municipio.id && styles.chipSelected]}
              onPress={() => {
                setSelectedMunicipio(municipio.id);
                if (municipio.id !== selectedMunicipio) {
                  setForm((prev) => ({ ...prev, zonaId: '' }));
                }
              }}
            >
              <Text style={selectedMunicipio === municipio.id ? styles.chipTextSelected : styles.chipText}>
                {municipio.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, styles.topSpacing]}>Zona</Text>
        <View style={styles.chipContainer}>
          {filteredZonas.map((zona) => (
            <TouchableOpacity
              key={zona.id}
              style={[styles.chip, form.zonaId === String(zona.id) && styles.chipSelected]}
              onPress={() => setForm((prev) => ({ ...prev, zonaId: String(zona.id) }))}
            >
              <Text style={form.zonaId === String(zona.id) ? styles.chipTextSelected : styles.chipText}>
                {zona.nombre}
                {zona.municipio?.nombre ? ` · ${zona.municipio.nombre}` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {filteredZonas.length === 0 && (
          <Text style={styles.muted}>No hay zonas para el municipio seleccionado.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Datos del ciudadano</Text>
        <TextInput
          placeholder="Nombre del ciudadano"
          value={form.nombre}
          onChangeText={(text) => setForm((prev) => ({ ...prev, nombre: text }))}
          style={styles.input}
        />
        <TextInput
          placeholder="Cédula del ciudadano"
          value={form.cedula}
          onChangeText={(text) => setForm((prev) => ({ ...prev, cedula: text.replace(/[^0-9]/g, '') }))}
          style={styles.input}
          keyboardType="numeric"
          maxLength={15}
        />
        <TextInput
          placeholder="Teléfono"
          value={form.telefono}
          onChangeText={(text) => setForm((prev) => ({ ...prev, telefono: text }))}
          style={styles.input}
          keyboardType="phone-pad"
        />
        <Text style={styles.label}>Tipo de vivienda</Text>
        <View style={styles.chipContainer}>
          {viviendaOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, form.tipoVivienda === option.value && styles.chipSelected]}
              onPress={() => setForm((prev) => ({ ...prev, tipoVivienda: option.value }))}
            >
              <Text style={form.tipoVivienda === option.value ? styles.chipTextSelected : styles.chipText}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, styles.topSpacing]}>Rango de edad</Text>
        <View style={styles.chipContainer}>
          {edadOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, form.rangoEdad === option.value && styles.chipSelected]}
              onPress={() => setForm((prev) => ({ ...prev, rangoEdad: option.value }))}
            >
              <Text style={form.rangoEdad === option.value ? styles.chipTextSelected : styles.chipText}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, styles.topSpacing]}>Ocupación</Text>
        <View style={styles.chipContainer}>
          {ocupacionOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, form.ocupacion === option.value && styles.chipSelected]}
              onPress={() => setForm((prev) => ({ ...prev, ocupacion: option.value }))}
            >
              <Text style={form.ocupacion === option.value ? styles.chipTextSelected : styles.chipText}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Perfil electoral</Text>
        <Text style={styles.label}>Nivel de afinidad</Text>
        <View style={styles.chipContainer}>
          {afinidadOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, form.nivelAfinidad === option.value && styles.chipSelected]}
              onPress={() => setForm((prev) => ({ ...prev, nivelAfinidad: option.value }))}
            >
              <Text style={form.nivelAfinidad === option.value ? styles.chipTextSelected : styles.chipText}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, styles.topSpacing]}>Disposición al voto</Text>
        <View style={styles.chipContainer}>
          {disposicionOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, form.disposicionVoto === option.value && styles.chipSelected]}
              onPress={() => setForm((prev) => ({ ...prev, disposicionVoto: option.value }))}
            >
              <Text style={form.disposicionVoto === option.value ? styles.chipTextSelected : styles.chipText}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, styles.topSpacing]}>Capacidad de influencia</Text>
        <View style={styles.chipContainer}>
          {influenciaOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, form.capacidadInfluencia === option.value && styles.chipSelected]}
              onPress={() => setForm((prev) => ({ ...prev, capacidadInfluencia: option.value }))}
            >
              <Text style={form.capacidadInfluencia === option.value ? styles.chipTextSelected : styles.chipText}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Condiciones y consentimiento</Text>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Tiene niños</Text>
          <Switch
            value={form.tieneNinos}
            onValueChange={(value) => setForm((prev) => ({ ...prev, tieneNinos: value }))}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Adultos mayores</Text>
          <Switch
            value={form.tieneAdultosMayores}
            onValueChange={(value) => setForm((prev) => ({ ...prev, tieneAdultosMayores: value }))}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Personas con discapacidad</Text>
          <Switch
            value={form.tieneDiscapacidad}
            onValueChange={(value) => setForm((prev) => ({ ...prev, tieneDiscapacidad: value }))}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Caso crítico</Text>
          <Switch
            value={form.casoCritico}
            onValueChange={(value) => setForm((prev) => ({ ...prev, casoCritico: value }))}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Consentimiento informado</Text>
          <Switch
            value={form.consentimiento}
            onValueChange={(value) => setForm((prev) => ({ ...prev, consentimiento: value }))}
          />
        </View>
        <TextInput
          placeholder="Comentario o problema identificado"
          value={form.comentario}
          onChangeText={(text) => setForm((prev) => ({ ...prev, comentario: text }))}
          style={[styles.input, styles.multiline]}
          multiline
          numberOfLines={3}
        />
        <View style={styles.row}>
          <View style={styles.flexItem}>
            <Text style={styles.label}>Latitud (opcional)</Text>
            <TextInput
              placeholder="6.2476"
              value={form.lat}
              onChangeText={(text) => setForm((prev) => ({ ...prev, lat: text }))}
              style={styles.input}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.flexItem, styles.leftSpacing]}>
            <Text style={styles.label}>Longitud (opcional)</Text>
            <TextInput
              placeholder="-75.5658"
              value={form.lon}
              onChangeText={(text) => setForm((prev) => ({ ...prev, lon: text }))}
              style={styles.input}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Necesidades identificadas</Text>
        <Text style={styles.helper}>Selecciona hasta 3 necesidades. El orden define la prioridad.</Text>
        <View style={styles.chipContainer}>
          {needs.map((need) => (
            <TouchableOpacity
              key={need.id}
              style={[styles.chip, selectedNeeds.includes(need.id) && styles.chipSelected]}
              onPress={() => toggleNeed(need.id)}
            >
              <Text style={selectedNeeds.includes(need.id) ? styles.chipTextSelected : styles.chipText}>{need.nombre}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {selectedNeeds.length > 0 && (
          <Text style={styles.helper}>
            Prioridades: {selectedNeeds.map((id, index) => `${index + 1}. ${needs.find((n) => n.id === id)?.nombre || ''}`).join('  ')}
          </Text>
        )}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={saving}>
        <Text style={styles.primaryButtonText}>{saving ? 'Guardando...' : editingSurveyId ? 'Actualizar encuesta' : 'Registrar encuesta'}</Text>
      </TouchableOpacity>

      {editingSurveyId && (
        <TouchableOpacity style={styles.secondaryButton} onPress={cancelEdit} disabled={saving}>
          <Text style={styles.secondaryButtonText}>Cancelar edición</Text>
        </TouchableOpacity>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Encuestas registradas</Text>
        {listLoading && <Text style={styles.muted}>Cargando encuestas...</Text>}
        {!listLoading && surveys.length === 0 && <Text style={styles.muted}>Aún no hay encuestas registradas.</Text>}
        {!listLoading &&
          surveys.map((survey) => (
            <TouchableOpacity key={survey.id} style={styles.listItem} onPress={() => startEdit(survey.id)}>
              <View>
                <Text style={styles.listTitle}>Encuesta #{survey.id}</Text>
                <Text style={styles.listSubtitle}>Fecha: {new Date(survey.fecha_creacion).toLocaleDateString()}</Text>
                {survey.zona_nombre ? <Text style={styles.listSubtitle}>{survey.zona_nombre}</Text> : null}
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
  label: { color: '#0f172a', marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
  },
  multiline: { textAlignVertical: 'top' },
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
  primaryButton: {
    backgroundColor: '#1f6feb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: '#b91c1c', marginBottom: 8 },
  success: { color: '#16a34a', marginBottom: 8 },
  info: { color: '#0f172a', marginBottom: 8 },
  warning: { color: '#b45309', textAlign: 'center', padding: 16 },
  helper: { color: '#64748b', marginBottom: 6 },
  muted: { color: '#94a3b8' },
  spacing: { marginVertical: 8 },
  topSpacing: { marginTop: 12 },
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 10 },
  flexItem: { flex: 1 },
  leftSpacing: { marginLeft: 8 },
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
});

export default CreateSurveyScreen;
