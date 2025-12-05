import 'package:flutter/material.dart';

import '../../models/survey.dart';
import '../../repositories/backend_repository.dart';

class SurveyListScreen extends StatefulWidget {
  const SurveyListScreen({super.key, required this.repository});

  final BackendRepository repository;

  @override
  State<SurveyListScreen> createState() => _SurveyListScreenState();
}

class _SurveyListScreenState extends State<SurveyListScreen> {
  late Future<List<SurveyRow>> _future;
  String? _municipioFilter;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<SurveyRow>> _load() async {
    return widget.repository.fetchSurveys();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<SurveyRow>>(
      future: _future,
      builder: (BuildContext context, AsyncSnapshot<List<SurveyRow>> snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('Error al cargar encuestas: ${snapshot.error}'));
        }
        final List<SurveyRow> surveys = snapshot.data!;
        final List<String> municipios = surveys
            .map((SurveyRow s) => s.municipioNombre ?? '-')
            .toSet()
            .toList()
          ..sort();
        final Iterable<SurveyRow> filtered = _municipioFilter == null || _municipioFilter!.isEmpty
            ? surveys
            : surveys.where((SurveyRow s) => s.municipioNombre == _municipioFilter);
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  const Text('Municipio:'),
                  const SizedBox(width: 8),
                  DropdownButton<String?>(
                    value: _municipioFilter,
                    items: [
                      const DropdownMenuItem<String?>(value: null, child: Text('Todos')),
                      ...municipios
                          .map(
                            (String muni) => DropdownMenuItem<String?>(
                              value: muni,
                              child: Text(muni),
                            ),
                          )
                          .toList(),
                    ],
                    onChanged: (String? value) => setState(() => _municipioFilter = value),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.refresh),
                    onPressed: () => setState(() => _future = _load()),
                  ),
                ],
              ),
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async => setState(() => _future = _load()),
                child: ListView(
                  padding: const EdgeInsets.all(12),
                  children: filtered
                      .map((SurveyRow survey) => Card(
                            child: ListTile(
                              title: Text(survey.nombreCiudadano ?? 'Ciudadano sin nombre'),
                              subtitle: Text(
                                '${survey.municipioNombre ?? '-'} · ${survey.zonaNombre ?? survey.zona} · ${survey.telefono}',
                              ),
                              trailing: Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(survey.casoCritico ? 'Crítico' : 'Normal',
                                      style: TextStyle(
                                        color: survey.casoCritico ? Colors.red : Colors.green,
                                        fontWeight: FontWeight.bold,
                                      )),
                                  Text('${survey.necesidades.length} necesidades'),
                                ],
                              ),
                              onTap: () => _showDetails(context, survey),
                            ),
                          ))
                      .toList(),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  void _showDetails(BuildContext context, SurveyRow survey) {
    showModalBottomSheet<void>(
      context: context,
      builder: (_) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(survey.nombreCiudadano ?? 'Sin nombre', style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text('${survey.municipioNombre ?? '-'} · Zona ${survey.zonaNombre ?? survey.zona}'),
            const SizedBox(height: 4),
            Text('Teléfono: ${survey.telefono}'),
            const SizedBox(height: 8),
            const Text('Necesidades priorizadas', style: TextStyle(fontWeight: FontWeight.bold)),
            ...survey.necesidades.map((SurveyNeed n) => Text('${n.prioridad}. ${n.nombre}')),
          ],
        ),
      ),
    );
  }
}
