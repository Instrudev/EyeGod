import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import 'agenda_screen.dart';
import 'assignments_screen.dart';
import 'candidates_screen.dart';
import 'collaborators_screen.dart';
import 'dashboard_screen.dart';
import 'leaders_screen.dart';
import 'survey_form_screen.dart';
import 'survey_list_screen.dart';
import 'unified_report_screen.dart';

class RootScaffold extends StatefulWidget {
  const RootScaffold({super.key});

  @override
  State<RootScaffold> createState() => _RootScaffoldState();
}

class _RootScaffoldState extends State<RootScaffold> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final AuthProvider auth = context.read<AuthProvider>();
    final List<_NavItem> items = [
      _NavItem('Dashboard', Icons.dashboard, DashboardScreen(apiClient: auth.apiClient)),
      _NavItem('Cobertura', Icons.map, DashboardScreen(apiClient: auth.apiClient, coverageOnly: true)),
      _NavItem('Encuestas', Icons.table_chart, SurveyListScreen(apiClient: auth.apiClient)),
      _NavItem('Captura', Icons.playlist_add, SurveyFormScreen(apiClient: auth.apiClient)),
      _NavItem('Agenda', Icons.calendar_today, AgendaScreen(apiClient: auth.apiClient)),
      _NavItem('Asignaciones', Icons.assignment_ind, AssignmentsScreen(apiClient: auth.apiClient)),
      _NavItem('Colaboradores', Icons.people, CollaboratorsScreen(apiClient: auth.apiClient)),
      _NavItem('Líderes', Icons.manage_accounts, LeadersScreen(apiClient: auth.apiClient)),
      _NavItem('Candidatos', Icons.campaign, CandidatesScreen(apiClient: auth.apiClient)),
      _NavItem('Reporte unificado', Icons.summarize, UnifiedReportScreen(apiClient: auth.apiClient)),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(items[_selectedIndex].label),
        actions: [
          if (auth.user != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Center(
                child: Text('${auth.user!.name} · ${auth.user!.role}'),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: auth.logout,
            tooltip: 'Cerrar sesión',
          ),
        ],
      ),
      drawer: Drawer(
        child: SafeArea(
          child: ListView(
            children: [
              const DrawerHeader(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('PITPC', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                    SizedBox(height: 8),
                    Text('Aplicación Flutter')
                  ],
                ),
              ),
              for (int i = 0; i < items.length; i++)
                ListTile(
                  leading: Icon(items[i].icon),
                  selected: _selectedIndex == i,
                  title: Text(items[i].label),
                  onTap: () => setState(() => _selectedIndex = i),
                ),
            ],
          ),
        ),
      ),
      body: SafeArea(child: items[_selectedIndex].builder),
    );
  }
}

class _NavItem {
  const _NavItem(this.label, this.icon, this.builder);
  final String label;
  final IconData icon;
  final Widget builder;
}
