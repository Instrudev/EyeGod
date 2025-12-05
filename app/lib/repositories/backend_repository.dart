import '../models/catalogs.dart';
import '../models/coverage.dart';
import '../models/survey.dart';
import '../services/api_client.dart';

class BackendRepository {
  const BackendRepository({required ApiClient apiClient}) : _apiClient = apiClient;

  final ApiClient _apiClient;

  Future<DashboardBundle> loadDashboard({bool coverageOnly = false}) async {
    final List<dynamic> coverageJson = await _apiClient.get('/cobertura/zonas') as List<dynamic>;
    final List<CoverageZone> coverage =
        coverageJson.map((dynamic e) => CoverageZone.fromJson(e as Map<String, dynamic>)).toList();
    Map<String, dynamic>? resumen;
    if (!coverageOnly) {
      try {
        resumen = await _apiClient.get('/dashboard/resumen/') as Map<String, dynamic>;
      } catch (_) {
        resumen = null;
      }
    }
    return DashboardBundle(coverage: coverage, resumen: resumen);
  }

  Future<List<SurveyRow>> fetchSurveys() async {
    final List<dynamic> data = await _apiClient.get('/encuestas/') as List<dynamic>;
    return data.map((dynamic e) => SurveyRow.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> submitSurvey({
    required int zona,
    required String telefono,
    required String nombreCiudadano,
    required bool casoCritico,
    required String necesidad,
  }) async {
    await _apiClient.post('/encuestas/', body: {
      'zona': zona,
      'telefono': telefono,
      'nombre_ciudadano': nombreCiudadano,
      'caso_critico': casoCritico,
      'necesidades': [
        {
          'prioridad': 1,
          'necesidad': {'nombre': necesidad},
        },
      ],
    });
  }

  Future<List<AgendaItem>> fetchAgenda() async {
    final dynamic data = await _apiClient.get('/agenda/');
    if (data is! List<dynamic>) return <AgendaItem>[];
    return data.map((dynamic e) => AgendaItem.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<AssignmentRow>> fetchAssignments() async {
    final dynamic data = await _apiClient.get('/asignaciones/');
    if (data is! List<dynamic>) return <AssignmentRow>[];
    return data.map((dynamic e) => AssignmentRow.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<CollaboratorRow>> fetchCollaborators() async {
    final dynamic data = await _apiClient.get('/colaboradores/');
    if (data is! List<dynamic>) return <CollaboratorRow>[];
    return data.map((dynamic e) => CollaboratorRow.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<LeaderRow>> fetchLeaders() async {
    final dynamic data = await _apiClient.get('/lideres/');
    if (data is! List<dynamic>) return <LeaderRow>[];
    return data.map((dynamic e) => LeaderRow.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<CandidateRow>> fetchCandidates() async {
    final dynamic data = await _apiClient.get('/candidatos/');
    if (data is! List<dynamic>) return <CandidateRow>[];
    return data.map((dynamic e) => CandidateRow.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Map<String, dynamic>> fetchUnifiedReport() async {
    final dynamic data = await _apiClient.get('/reportes/');
    return (data as Map<String, dynamic>?) ?? <String, dynamic>{};
  }
}

class DashboardBundle {
  const DashboardBundle({required this.coverage, required this.resumen});

  final List<CoverageZone> coverage;
  final Map<String, dynamic>? resumen;
}
