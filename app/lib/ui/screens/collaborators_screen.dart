import 'package:flutter/material.dart';

import '../../services/api_client.dart';

class CollaboratorsScreen extends StatefulWidget {
  const CollaboratorsScreen({super.key, required this.apiClient});

  final ApiClient apiClient;

  @override
  State<CollaboratorsScreen> createState() => _CollaboratorsScreenState();
}

class _CollaboratorsScreenState extends State<CollaboratorsScreen> {
  late Future<List<dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<dynamic>> _load() async {
    final dynamic data = await widget.apiClient.get('/colaboradores/');
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
          return Center(child: Text('No pudimos cargar colaboradores: ${snapshot.error}'));
        }
        final List<dynamic> collaborators = snapshot.data ?? <dynamic>[];
        return RefreshIndicator(
          onRefresh: () async => setState(() => _future = _load()),
          child: ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: collaborators.length,
            itemBuilder: (BuildContext context, int index) {
              final Map<String, dynamic> row = collaborators[index] as Map<String, dynamic>;
              return ListTile(
                leading: const Icon(Icons.person_outline),
                title: Text(row['nombre']?.toString() ?? 'Colaborador'),
                subtitle: Text(row['email']?.toString() ?? ''),
                trailing: Text('Meta ${row['meta_encuestas'] ?? '-'}'),
              );
            },
          ),
        );
      },
    );
  }
}
