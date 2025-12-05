import 'package:flutter/material.dart';

import '../../models/catalogs.dart';
import '../../repositories/backend_repository.dart';

class CandidatesScreen extends StatefulWidget {
  const CandidatesScreen({super.key, required this.repository});

  final BackendRepository repository;

  @override
  State<CandidatesScreen> createState() => _CandidatesScreenState();
}

class _CandidatesScreenState extends State<CandidatesScreen> {
  late Future<List<CandidateRow>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<CandidateRow>> _load() async {
    return widget.repository.fetchCandidates();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<CandidateRow>>(
      future: _future,
      builder: (BuildContext context, AsyncSnapshot<List<CandidateRow>> snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('No pudimos cargar candidatos: ${snapshot.error}'));
        }
        final List<CandidateRow> candidates = snapshot.data ?? <CandidateRow>[];
        return RefreshIndicator(
          onRefresh: () async => setState(() => _future = _load()),
          child: ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: candidates.length,
            itemBuilder: (BuildContext context, int index) {
              final CandidateRow row = candidates[index];
              return ListTile(
                leading: const Icon(Icons.campaign_outlined),
                title: Text(row.name),
                subtitle: Text('${row.party} · ${row.location}'),
              );
            },
          ),
        );
      },
    );
  }
}
