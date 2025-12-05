import 'package:flutter/material.dart';

import '../../services/api_client.dart';

class AgendaScreen extends StatefulWidget {
  const AgendaScreen({super.key, required this.apiClient});

  final ApiClient apiClient;

  @override
  State<AgendaScreen> createState() => _AgendaScreenState();
}

class _AgendaScreenState extends State<AgendaScreen> {
  late Future<List<dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<dynamic>> _load() async {
    final dynamic data = await widget.apiClient.get('/agenda/');
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
          return Center(child: Text('No pudimos cargar la agenda: ${snapshot.error}'));
        }
        final List<dynamic> agenda = snapshot.data ?? <dynamic>[];
        if (agenda.isEmpty) {
          return const Center(child: Text('No hay rutas activas')); 
        }
        return RefreshIndicator(
          onRefresh: () async => setState(() => _future = _load()),
          child: ListView.builder(
            itemCount: agenda.length,
            itemBuilder: (BuildContext context, int index) {
              final Map<String, dynamic> item = agenda[index] as Map<String, dynamic>;
              return ListTile(
                title: Text(item['titulo']?.toString() ?? 'Ruta ${index + 1}'),
                subtitle: Text(item['descripcion']?.toString() ?? 'Sin descripción'),
                trailing: Text(item['fecha']?.toString() ?? ''),
              );
            },
          ),
        );
      },
    );
  }
}
