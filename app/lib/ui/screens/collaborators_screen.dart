import 'package:flutter/material.dart';

import '../../models/catalogs.dart';
import '../../repositories/backend_repository.dart';

class CollaboratorsScreen extends StatefulWidget {
  const CollaboratorsScreen({super.key, required this.repository});

  final BackendRepository repository;

  @override
  State<CollaboratorsScreen> createState() => _CollaboratorsScreenState();
}

class _CollaboratorsScreenState extends State<CollaboratorsScreen> {
  late Future<List<CollaboratorRow>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<CollaboratorRow>> _load() async {
    return widget.repository.fetchCollaborators();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<CollaboratorRow>>(
      future: _future,
      builder: (BuildContext context, AsyncSnapshot<List<CollaboratorRow>> snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('No pudimos cargar colaboradores: ${snapshot.error}'));
        }
        final List<CollaboratorRow> collaborators = snapshot.data ?? <CollaboratorRow>[];
        return RefreshIndicator(
          onRefresh: () async => setState(() => _future = _load()),
          child: ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: collaborators.length,
            itemBuilder: (BuildContext context, int index) {
              final CollaboratorRow row = collaborators[index];
              return ListTile(
                leading: const Icon(Icons.person_outline),
                title: Text(row.name),
                subtitle: Text(row.email),
                trailing: Text('Meta ${row.target}'),
              );
            },
          ),
        );
      },
    );
  }
}
