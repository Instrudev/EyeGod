import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class KpiCards extends StatelessWidget {
  const KpiCards({super.key, required this.resumen});

  final Map<String, dynamic> resumen;

  @override
  Widget build(BuildContext context) {
    final NumberFormat formatter = NumberFormat.decimalPattern();
    final List<_Kpi> kpis = [
      _Kpi('Encuestas', resumen['total_encuestas']),
      _Kpi('Zonas cumplidas', resumen['zonas_cumplidas']),
      _Kpi('Zonas sin cobertura', resumen['zonas_sin_cobertura']),
      _Kpi('Casos críticos', resumen['casos_activos']),
    ];

    return Wrap(
      spacing: 12,
      runSpacing: 12,
      children: kpis
          .map(
            (k) => SizedBox(
              width: 220,
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(k.label, style: const TextStyle(color: Colors.black54)),
                      const SizedBox(height: 8),
                      Text(
                        formatter.format(k.value ?? 0),
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          )
          .toList(),
    );
  }
}

class _Kpi {
  const _Kpi(this.label, this.value);
  final String label;
  final dynamic value;
}
