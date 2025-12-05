import 'package:flutter/material.dart';

import '../../models/coverage.dart';
import '../../services/api_client.dart';
import '../widgets/kpi_cards.dart';
import '../widgets/needs_chart.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key, required this.apiClient, this.coverageOnly = false});

  final ApiClient apiClient;
  final bool coverageOnly;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late Future<_DashboardData> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<_DashboardData> _load() async {
    final List<dynamic> coverageJson = await widget.apiClient.get('/cobertura/zonas') as List<dynamic>;
    final List<CoverageZone> coverage =
        coverageJson.map((dynamic e) => CoverageZone.fromJson(e as Map<String, dynamic>)).toList();
    Map<String, dynamic>? resumen;
    if (!widget.coverageOnly) {
      try {
        resumen = await widget.apiClient.get('/dashboard/resumen/') as Map<String, dynamic>;
      } catch (_) {
        resumen = null;
      }
    }
    return _DashboardData(coverage: coverage, resumen: resumen);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_DashboardData>(
      future: _future,
      builder: (BuildContext context, AsyncSnapshot<_DashboardData> snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(
            child: Text('No pudimos cargar el tablero: ${snapshot.error}'),
          );
        }
        final _DashboardData data = snapshot.data!;
        return RefreshIndicator(
          onRefresh: () async => setState(() => _future = _load()),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (data.resumen != null && !widget.coverageOnly)
                KpiCards(resumen: data.resumen!),
              CoverageTable(coverage: data.coverage),
              const SizedBox(height: 12),
              if (!widget.coverageOnly)
                NeedsChart(needs: data.collectNeeds()),
            ],
          ),
        );
      },
    );
  }
}

class CoverageTable extends StatelessWidget {
  const CoverageTable({super.key, required this.coverage});
  final List<CoverageZone> coverage;

  Color _badgeColor(String estado) {
    switch (estado) {
      case 'CUMPLIDA':
        return Colors.green;
      case 'MEDIA':
        return Colors.orange;
      case 'BAJA':
        return Colors.amber;
      default:
        return Colors.red;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Cobertura por zona', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columns: const [
                  DataColumn(label: Text('Municipio')),
                  DataColumn(label: Text('Zona')),
                  DataColumn(label: Text('Meta')),
                  DataColumn(label: Text('Encuestas')),
                  DataColumn(label: Text('Cobertura')),
                  DataColumn(label: Text('Estado')),
                ],
                rows: coverage
                    .map(
                      (CoverageZone z) => DataRow(cells: [
                        DataCell(Text(z.municipioNombre)),
                        DataCell(Text(z.zonaNombre)),
                        DataCell(Text(z.metaEncuestas.toString())),
                        DataCell(Text(z.totalEncuestas.toString())),
                        DataCell(Text('${z.coberturaPorcentaje.toStringAsFixed(1)}%')),
                        DataCell(Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: _badgeColor(z.estadoCobertura).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            z.estadoCobertura,
                            style: TextStyle(color: _badgeColor(z.estadoCobertura), fontWeight: FontWeight.bold),
                          ),
                        )),
                      ]),
                    )
                    .toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DashboardData {
  const _DashboardData({required this.coverage, required this.resumen});
  final List<CoverageZone> coverage;
  final Map<String, dynamic>? resumen;

  List<CoverageNeed> collectNeeds() {
    final Map<String, CoverageNeed> byName = {};
    for (final CoverageZone zone in coverage) {
      for (final CoverageNeed need in zone.necesidades ?? <CoverageNeed>[]) {
        byName.update(
          need.nombre,
          (CoverageNeed existing) => CoverageNeed(nombre: existing.nombre, total: existing.total + need.total),
          ifAbsent: () => need,
        );
      }
    }
    return byName.values.toList();
  }
}
