import 'package:flutter/material.dart';

import '../../models/catalogs.dart';
import '../../repositories/backend_repository.dart';

class AgendaScreen extends StatefulWidget {
  const AgendaScreen({super.key, required this.repository});

  final BackendRepository repository;

  @override
  State<AgendaScreen> createState() => _AgendaScreenState();
}

class _AgendaScreenState extends State<AgendaScreen> {
  late Future<List<AgendaItem>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<AgendaItem>> _load() async {
    return widget.repository.fetchAgenda();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<AgendaItem>>(
      future: _future,
      builder: (BuildContext context, AsyncSnapshot<List<AgendaItem>> snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('No pudimos cargar la agenda: ${snapshot.error}'));
        }
        final List<AgendaItem> agenda = snapshot.data ?? <AgendaItem>[];
        if (agenda.isEmpty) {
          return const Center(child: Text('No hay rutas activas'));
        }
        return RefreshIndicator(
          onRefresh: () async => setState(() => _future = _load()),
          child: ListView.builder(
            itemCount: agenda.length,
            itemBuilder: (BuildContext context, int index) {
              final AgendaItem item = agenda[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                child: ListTile(
                  title: Text(item.title),
                  subtitle: Text(item.description),
                  trailing: Text(item.date),
                ),
              );
            },
          ),
        );
      },
    );
  }
}
