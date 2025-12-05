import 'package:flutter/material.dart';

import '../../models/catalogs.dart';
import '../../repositories/backend_repository.dart';

class LeadersScreen extends StatefulWidget {
  const LeadersScreen({super.key, required this.repository});

  final BackendRepository repository;

  @override
  State<LeadersScreen> createState() => _LeadersScreenState();
}

class _LeadersScreenState extends State<LeadersScreen> {
  late Future<List<LeaderRow>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<LeaderRow>> _load() async {
    return widget.repository.fetchLeaders();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<LeaderRow>>(
      future: _future,
      builder: (BuildContext context, AsyncSnapshot<List<LeaderRow>> snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('No pudimos cargar líderes: ${snapshot.error}'));
        }
        final List<LeaderRow> leaders = snapshot.data ?? <LeaderRow>[];
        return RefreshIndicator(
          onRefresh: () async => setState(() => _future = _load()),
          child: ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: leaders.length,
            itemBuilder: (BuildContext context, int index) {
              final LeaderRow row = leaders[index];
              return ListTile(
                leading: const Icon(Icons.badge_outlined),
                title: Text(row.name),
                subtitle: Text(row.phone),
              );
            },
          ),
        );
      },
    );
  }
}
