class AgendaItem {
  const AgendaItem({required this.title, required this.description, required this.date});

  final String title;
  final String description;
  final String date;

  factory AgendaItem.fromJson(Map<String, dynamic> json) {
    return AgendaItem(
      title: json['titulo'] as String? ?? 'Ruta',
      description: json['descripcion'] as String? ?? 'Sin descripción',
      date: json['fecha'] as String? ?? '',
    );
  }
}

class AssignmentRow {
  const AssignmentRow({
    required this.collaborator,
    required this.zone,
    required this.target,
  });

  final String collaborator;
  final String zone;
  final int target;

  factory AssignmentRow.fromJson(Map<String, dynamic> json) {
    return AssignmentRow(
      collaborator: json['colaborador_nombre'] as String? ?? 'Colaborador',
      zone: json['zona_nombre']?.toString() ?? json['zona']?.toString() ?? '-',
      target: (json['meta_encuestas'] as num?)?.toInt() ?? 0,
    );
  }
}

class CollaboratorRow {
  const CollaboratorRow({
    required this.name,
    required this.email,
    required this.target,
  });

  final String name;
  final String email;
  final int target;

  factory CollaboratorRow.fromJson(Map<String, dynamic> json) {
    return CollaboratorRow(
      name: json['nombre'] as String? ?? 'Colaborador',
      email: json['email'] as String? ?? '-',
      target: (json['meta_encuestas'] as num?)?.toInt() ?? 0,
    );
  }
}

class LeaderRow {
  const LeaderRow({required this.name, required this.phone});

  final String name;
  final String phone;

  factory LeaderRow.fromJson(Map<String, dynamic> json) {
    return LeaderRow(
      name: json['nombre'] as String? ?? 'Líder',
      phone: json['telefono'] as String? ?? '-',
    );
  }
}

class CandidateRow {
  const CandidateRow({required this.name, required this.party, required this.location});

  final String name;
  final String party;
  final String location;

  factory CandidateRow.fromJson(Map<String, dynamic> json) {
    return CandidateRow(
      name: json['nombre'] as String? ?? 'Candidato',
      party: json['partido'] as String? ?? '-',
      location: json['municipio']?.toString() ?? '-',
    );
  }
}
