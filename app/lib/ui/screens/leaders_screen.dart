import 'package:flutter/material.dart';

import '../../services/api_client.dart';

class LeadersScreen extends StatefulWidget {
  const LeadersScreen({super.key, required this.apiClient});

  final ApiClient apiClient;

  @override
  State<LeadersScreen> createState() => _LeadersScreenState();
}

class _LeadersScreenState extends State<LeadersScreen> {
  late Future<List<dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<dynamic>> _load() async {
    final dynamic data = await widget.apiClient.get('/lideres/');
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
          return Center(child: Text('No pudimos cargar líderes: ${snapshot.error}'));
        }
        final List<dynamic> leaders = snapshot.data ?? <dynamic>[];
        return RefreshIndicator(
          onRefresh: () async => setState(() => _future = _load()),
          child: ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: leaders.length,
            itemBuilder: (BuildContext context, int index) {
              final Map<String, dynamic> row = leaders[index] as Map<String, dynamic>;
              return ListTile(
                leading: const Icon(Icons.badge_outlined),
                title: Text(row['nombre']?.toString() ?? 'Líder'),
                subtitle: Text(row['telefono']?.toString() ?? ''),
              );
            },
          ),
        );
      },
    );
  }
}
