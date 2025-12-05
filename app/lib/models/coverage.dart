class CoverageZone {
  const CoverageZone({
    required this.zona,
    required this.zonaNombre,
    required this.municipioNombre,
    required this.metaEncuestas,
    required this.totalEncuestas,
    required this.coberturaPorcentaje,
    required this.estadoCobertura,
    this.lat,
    this.lon,
    this.municipioLat,
    this.municipioLon,
    this.necesidades,
  });

  final int zona;
  final String zonaNombre;
  final String municipioNombre;
  final int metaEncuestas;
  final int totalEncuestas;
  final double coberturaPorcentaje;
  final String estadoCobertura;
  final double? lat;
  final double? lon;
  final double? municipioLat;
  final double? municipioLon;
  final List<CoverageNeed>? necesidades;

  factory CoverageZone.fromJson(Map<String, dynamic> json) {
    return CoverageZone(
      zona: json['zona'] as int,
      zonaNombre: json['zona_nombre'] as String? ?? '-'.toUpperCase(),
      municipioNombre: json['municipio_nombre'] as String? ?? '-'.toUpperCase(),
      metaEncuestas: (json['meta_encuestas'] as num?)?.toInt() ?? 0,
      totalEncuestas: (json['total_encuestas'] as num?)?.toInt() ?? 0,
      coberturaPorcentaje: (json['cobertura_porcentaje'] as num?)?.toDouble() ?? 0,
      estadoCobertura: json['estado_cobertura'] as String? ?? 'SIN_COBERTURA',
      lat: (json['lat'] as num?)?.toDouble(),
      lon: (json['lon'] as num?)?.toDouble(),
      municipioLat: (json['municipio_lat'] as num?)?.toDouble(),
      municipioLon: (json['municipio_lon'] as num?)?.toDouble(),
      necesidades: (json['necesidades'] as List<dynamic>?)
          ?.map((n) => CoverageNeed.fromJson(n as Map<String, dynamic>))
          .toList(),
    );
  }
}

class CoverageNeed {
  const CoverageNeed({required this.nombre, required this.total});
  final String nombre;
  final int total;

  factory CoverageNeed.fromJson(Map<String, dynamic> json) {
    return CoverageNeed(
      nombre: json['nombre'] as String? ?? '-',
      total: (json['total'] as num?)?.toInt() ?? 0,
    );
  }
}
