import 'package:flutter/material.dart';

import '../../models/coverage.dart';

class NeedsChart extends StatelessWidget {
  const NeedsChart({super.key, required this.needs});

  final List<CoverageNeed> needs;

  @override
  Widget build(BuildContext context) {
    if (needs.isEmpty) {
      return const SizedBox.shrink();
    }
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Necesidades priorizadas', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Column(
              children: needs
                  .map(
                    (CoverageNeed n) => ListTile(
                      dense: true,
                      leading: CircleAvatar(child: Text('${n.total}')),
                      title: Text(n.nombre),
                    ),
                  )
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }
}
