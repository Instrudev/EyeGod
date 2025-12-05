import 'package:flutter/material.dart';

import '../../models/catalogs.dart';
import '../../repositories/backend_repository.dart';

class AssignmentsScreen extends StatefulWidget {
  const AssignmentsScreen({super.key, required this.repository});

  final BackendRepository repository;

  @override
  State<AssignmentsScreen> createState() => _AssignmentsScreenState();
}

class _AssignmentsScreenState extends State<AssignmentsScreen> {
  late Future<List<AssignmentRow>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<AssignmentRow>> _load() async {
    return widget.repository.fetchAssignments();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<AssignmentRow>>(
      future: _future,
      builder: (BuildContext context, AsyncSnapshot<List<AssignmentRow>> snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('No pudimos cargar las asignaciones: ${snapshot.error}'));
        }
        final List<AssignmentRow> assignments = snapshot.data ?? <AssignmentRow>[];
        return RefreshIndicator(
          onRefresh: () async => setState(() => _future = _load()),
          child: ListView.separated(
            padding: const EdgeInsets.all(12),
            itemCount: assignments.length,
            itemBuilder: (BuildContext context, int index) {
              final AssignmentRow row = assignments[index];
              return ListTile(
                title: Text(row.collaborator),
                subtitle: Text('Zona ${row.zone}'),
                trailing: Text('${row.target} metas'),
              );
            },
            separatorBuilder: (_, __) => const Divider(),
          ),
        );
      },
    );
  }
}
