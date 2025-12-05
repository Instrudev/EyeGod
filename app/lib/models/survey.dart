class SurveyRow {
  const SurveyRow({
    required this.id,
    required this.zona,
    required this.fechaHora,
    required this.telefono,
    required this.tipoVivienda,
    required this.rangoEdad,
    required this.ocupacion,
    required this.casoCritico,
    this.zonaNombre,
    this.municipioNombre,
    this.colaboradorNombre,
    this.nombreCiudadano,
    this.necesidades = const [],
  });

  final int id;
  final int zona;
  final String? zonaNombre;
  final String? municipioNombre;
  final String? colaboradorNombre;
  final String? nombreCiudadano;
  final DateTime fechaHora;
  final String telefono;
  final String tipoVivienda;
  final String rangoEdad;
  final String ocupacion;
  final bool casoCritico;
  final List<SurveyNeed> necesidades;

  factory SurveyRow.fromJson(Map<String, dynamic> json) {
    return SurveyRow(
      id: json['id'] as int,
      zona: json['zona'] as int,
      zonaNombre: json['zona_nombre'] as String?,
      municipioNombre: json['municipio_nombre'] as String?,
      colaboradorNombre: json['colaborador_nombre'] as String?,
      nombreCiudadano: json['nombre_ciudadano'] as String?,
      fechaHora: DateTime.parse(json['fecha_hora'] as String),
      telefono: json['telefono'] as String? ?? '-',
      tipoVivienda: json['tipo_vivienda'] as String? ?? '-',
      rangoEdad: json['rango_edad'] as String? ?? '-',
      ocupacion: json['ocupacion'] as String? ?? '-',
      casoCritico: json['caso_critico'] as bool? ?? false,
      necesidades: (json['necesidades'] as List<dynamic>?)
              ?.map((n) => SurveyNeed.fromJson(n as Map<String, dynamic>))
              .toList() ??
          const [],
    );
  }
}

class SurveyNeed {
  const SurveyNeed({required this.prioridad, required this.nombre});

  final int prioridad;
  final String nombre;

  factory SurveyNeed.fromJson(Map<String, dynamic> json) {
    final Map<String, dynamic>? inner = json['necesidad'] as Map<String, dynamic>?;
    return SurveyNeed(
      prioridad: (json['prioridad'] as num?)?.toInt() ?? 0,
      nombre: inner?['nombre'] as String? ?? '-',
    );
  }
}
