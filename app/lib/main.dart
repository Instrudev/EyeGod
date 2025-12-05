import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'providers/auth_provider.dart';
import 'repositories/backend_repository.dart';
import 'routes/app_router.dart';
import 'services/api_client.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final ApiClient apiClient = ApiClient();
  runApp(PitpcApp(apiClient: apiClient));
}

class PitpcApp extends StatelessWidget {
  const PitpcApp({super.key, required this.apiClient});

  final ApiClient apiClient;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>(
          create: (_) => AuthProvider(apiClient: apiClient),
        ),
        Provider<BackendRepository>(
          create: (_) => BackendRepository(apiClient: apiClient),
        ),
      ],
      child: MaterialApp(
        title: 'PITPC',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
          useMaterial3: true,
          inputDecorationTheme: const InputDecorationTheme(border: OutlineInputBorder()),
        ),
        home: const AppRouter(),
      ),
    );
  }
}
