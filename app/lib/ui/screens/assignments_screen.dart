import 'package:flutter/material.dart';

import '../../services/api_client.dart';

class AssignmentsScreen extends StatefulWidget {
  const AssignmentsScreen({super.key, required this.apiClient});

  final ApiClient apiClient;

  @override
  State<AssignmentsScreen> createState() => _AssignmentsScreenState();
}

class _AssignmentsScreenState extends State<AssignmentsScreen> {
  late Future<List<dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<dynamic>> _load() async {
    final dynamic data = await widget.apiClient.get('/asignaciones/');
    if (data is List<dynamic>) return data;
    return <dynamic>[];
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: _future,
      builder: (BuildContext context, AsyncSnapshot<List<dynamic>> snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('No pudimos cargar las asignaciones: ${snapshot.error}'));
        }
        final List<dynamic> assignments = snapshot.data ?? <dynamic>[];
        return RefreshIndicator(
          onRefresh: () async => setState(() => _future = _load()),
          child: ListView.separated(
            padding: const EdgeInsets.all(12),
            itemCount: assignments.length,
            itemBuilder: (BuildContext context, int index) {
              final Map<String, dynamic> row = assignments[index] as Map<String, dynamic>;
              return ListTile(
                title: Text(row['colaborador_nombre']?.toString() ?? 'Colaborador'),
                subtitle: Text('Zona ${row['zona_nombre'] ?? row['zona'] ?? ''}'),
                trailing: Text('${row['meta_encuestas'] ?? '-'} metas'),
              );
            },
            separatorBuilder: (_, __) => const Divider(),
          ),
        );
      },
    );
  }
}
