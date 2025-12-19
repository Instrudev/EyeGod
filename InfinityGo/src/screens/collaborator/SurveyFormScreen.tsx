import React, { useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { createSurvey, fetchNeeds, Need } from '@services/surveyService';
import { fetchMunicipios, fetchZonas, Municipio, Zona } from '@services/territoryService';
import { fetchAssignments } from '@services/assignmentService';
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

const SurveyFormScreen: React.FC = () => {
  const { user, signOut } = useAuthContext();
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [selectedMunicipio, setSelectedMunicipio] = useState<number | null>(null);
  const [selectedNeeds, setSelectedNeeds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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

  const isCollaborator = (user?.role || '').toUpperCase() === 'COLABORADOR';

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      setError(null);
      setLoading(true);
      try {
        if (isCollaborator) {
          const [assignments, needData] = await Promise.all([
            fetchAssignments(),
            fetchNeeds(),
          ]);

          const zonaMap = new Map<number, Zona>();
          assignments.forEach((assignment) => {
            zonaMap.set(assignment.zona_id, {
              id: assignment.zona_id,
              nombre: assignment.zona_nombre,
              tipo: assignment.zona_tipo || 'ZONA',
              municipio: assignment.municipio_id
                ? { id: assignment.municipio_id, nombre: assignment.municipio_nombre, departamento: 0 }
                : undefined,
            });
          });
          const zonasAsignadas = Array.from(zonaMap.values());

          const uniqueMunicipios = new Map<number, Municipio>();
          zonasAsignadas.forEach((zona) => {
            if (zona.municipio?.id) {
              uniqueMunicipios.set(zona.municipio.id, zona.municipio);
            }
          });

          setMunicipios(Array.from(uniqueMunicipios.values()));
          setZonas(zonasAsignadas);
          setNeeds(needData);

          if (zonasAsignadas.length === 0) {
            setError('No tienes zonas asignadas. Contacta a tu líder.');
            return;
          }

          const defaultZona = zonasAsignadas[0];
          setSelectedMunicipio(defaultZona.municipio?.id ?? null);
          setForm((prev) => ({ ...prev, zonaId: String(defaultZona.id) }));
        } else {
          const [municipioData, zonaData, needData] = await Promise.all([
            fetchMunicipios(),
            fetchZonas(),
            fetchNeeds(),
          ]);

          setMunicipios(municipioData);
          setZonas(zonaData);
          setNeeds(needData);

          const defaultZona = zonaData[0];
          if (defaultZona) {
            setSelectedMunicipio(defaultZona.municipio?.id ?? null);
            setForm((prev) => ({ ...prev, zonaId: String(defaultZona.id) }));
          }
        }
      } catch (err) {
        const axiosError = err as AxiosError;
        console.error('[SurveyBaseData] status:', axiosError?.response?.status);
        console.error('[SurveyBaseData] data:', axiosError?.response?.data);
        console.error('[SurveyBaseData] url:', axiosError?.config?.url);
        const status = axiosError?.response?.status;
        if (status && [401, 403].includes(status)) {
          setError('Sesión vencida o sin permisos. Vuelve a ingresar.');
          await signOut();
        } else {
          setError('No pudimos cargar la información base para la encuesta.');
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id, isCollaborator]);

  type GeoLocation = {
    getCurrentPosition: (
      success: (position: { coords: { latitude: number; longitude: number } }) => void,
      error?: (error: unknown) => void,
      options?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }
    ) => void;
  };

  useEffect(() => {
    const geo = (globalThis as { navigator?: { geolocation?: GeoLocation } }).navigator?.geolocation;
    if (!geo) return;
    geo.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          lat: String(position.coords.latitude),
          lon: String(position.coords.longitude),
        }));
      },
      (locationError) => {
        console.warn('No pudimos obtener la ubicación', locationError);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

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
        Alert.alert('Máximo 3 necesidades', 'Solo puedes registrar hasta 3 necesidades.');
        return prev;
      }
      return [...prev, id];
    });
  };

  const validateForm = () => {
    if (!form.zonaId) {
      setError('Selecciona una zona para registrar la encuesta.');
      return false;
    }
    if (!form.consentimiento) {
      setError('Debes contar con consentimiento informado.');
      return false;
    }
    if (!/^\d{1,15}$/.test(form.cedula)) {
      setError('La cédula es obligatoria y solo admite números (máx. 15).');
      return false;
    }
    if (!form.nivelAfinidad || !form.disposicionVoto || form.capacidadInfluencia === '') {
      setError('Selecciona afinidad, disposición de voto y capacidad de influencia.');
      return false;
    }
    if (selectedNeeds.length === 0) {
      setError('Selecciona al menos una necesidad (máximo 3).');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!isCollaborator && (user?.role || '').toUpperCase() !== 'ADMIN') {
      setError('Solo los colaboradores pueden registrar encuestas aquí.');
      return;
    }
    if (!validateForm()) return;

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

      await createSurvey(payload);
      setMessage('Encuesta registrada con éxito.');
      setSelectedNeeds([]);
      setForm((prev) => ({
        ...prev,
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
      }));
    } catch (err) {
      console.error(err);
      setError('No pudimos guardar la encuesta. Revisa los datos enviados.');
    } finally {
      setSaving(false);
    }
  };

  if (!isCollaborator) {
    return (
      <View style={styles.centered}>
        <Text style={styles.warning}>Este formulario está diseñado para colaboradores.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Registrar encuesta</Text>
      <Text style={styles.subtitle}>Replica el formulario territorial con los mismos campos del portal web.</Text>

      {loading && <ActivityIndicator style={styles.spacing} />}
      {error && <Text style={styles.error}>{error}</Text>}
      {message && <Text style={styles.success}>{message}</Text>}

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
              <Text style={selectedMunicipio === municipio.id ? styles.chipTextSelected : styles.chipText}>{municipio.nombre}</Text>
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
        {filteredZonas.length === 0 && <Text style={styles.muted}>No hay zonas para el municipio seleccionado.</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Datos del ciudadano</Text>
        <TextInput
          placeholder="Nombre del ciudadano (opcional)"
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
          placeholder="Teléfono (opcional)"
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
              <Text style={form.tipoVivienda === option.value ? styles.chipTextSelected : styles.chipText}>{option.label}</Text>
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
              <Text style={form.rangoEdad === option.value ? styles.chipTextSelected : styles.chipText}>{option.label}</Text>
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
              <Text style={form.ocupacion === option.value ? styles.chipTextSelected : styles.chipText}>{option.label}</Text>
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
              <Text style={form.nivelAfinidad === option.value ? styles.chipTextSelected : styles.chipText}>{option.label}</Text>
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
          <Switch value={form.tieneNinos} onValueChange={(value) => setForm((prev) => ({ ...prev, tieneNinos: value }))} />
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
          <Switch value={form.casoCritico} onValueChange={(value) => setForm((prev) => ({ ...prev, casoCritico: value }))} />
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
            <Text style={styles.label}>Latitud (auto)</Text>
            <TextInput
              placeholder="6.2476"
              value={form.lat}
              onChangeText={(text) => setForm((prev) => ({ ...prev, lat: text }))}
              style={styles.input}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.flexItem, styles.leftSpacing]}>
            <Text style={styles.label}>Longitud (auto)</Text>
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

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleSubmit}
        disabled={saving || loading || zonas.length === 0}
      >
        <Text style={styles.primaryButtonText}>{saving ? 'Guardando...' : 'Registrar encuesta'}</Text>
      </TouchableOpacity>
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
  warning: { color: '#b45309', textAlign: 'center', padding: 16 },
  helper: { color: '#64748b', marginBottom: 6 },
  muted: { color: '#94a3b8' },
  spacing: { marginVertical: 8 },
  topSpacing: { marginTop: 12 },
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
});

export default SurveyFormScreen;
