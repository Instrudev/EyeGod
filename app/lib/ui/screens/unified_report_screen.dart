import 'package:flutter/material.dart';

import '../../repositories/backend_repository.dart';

class UnifiedReportScreen extends StatefulWidget {
  const UnifiedReportScreen({super.key, required this.repository});

  final BackendRepository repository;

  @override
  State<UnifiedReportScreen> createState() => _UnifiedReportScreenState();
}

class _UnifiedReportScreenState extends State<UnifiedReportScreen> {
  late Future<Map<String, dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<Map<String, dynamic>> _load() async {
    return widget.repository.fetchUnifiedReport();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>>(
      future: _future,
      builder: (BuildContext context, AsyncSnapshot<Map<String, dynamic>> snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('No pudimos cargar el reporte: ${snapshot.error}'));
        }
        final Map<String, dynamic> report = snapshot.data ?? <String, dynamic>{};
        if (report.isEmpty) {
          return const Center(child: Text('Sin datos de reporte disponibles'));
        }
        return RefreshIndicator(
          onRefresh: () async => setState(() => _future = _load()),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(report['titulo']?.toString() ?? 'Reporte unificado',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              if (report['resumen_general'] != null)
                _KeyValueTable('Resumen general', report['resumen_general'] as Map<String, dynamic>),
              if (report['cobertura'] != null)
                _KeyValueTable('Cobertura', report['cobertura'] as Map<String, dynamic>),
              if (report['necesidades'] != null)
                _KeyValueTable('Necesidades', report['necesidades'] as Map<String, dynamic>),
              if (report['comentarios'] != null)
                _KeyValueTable('Comentarios', report['comentarios'] as Map<String, dynamic>),
              if (report['casos'] != null) _KeyValueTable('Casos', report['casos'] as Map<String, dynamic>),
              if (report['rutas'] != null) _KeyValueTable('Rutas', report['rutas'] as Map<String, dynamic>),
            ],
          ),
        );
      },
    );
  }
}

class _KeyValueTable extends StatelessWidget {
  const _KeyValueTable(this.title, this.data);
  final String title;
  final Map<String, dynamic> data;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ...data.entries.map(
              (MapEntry<String, dynamic> e) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(flex: 2, child: Text(e.key)),
                    Expanded(flex: 3, child: Text(e.value.toString())),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
