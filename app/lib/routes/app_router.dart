import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../ui/screens/login_screen.dart';
import '../ui/screens/root_scaffold.dart';

class AppRouter extends StatelessWidget {
  const AppRouter({super.key});

  @override
  Widget build(BuildContext context) {
    final AuthProvider auth = context.watch<AuthProvider>();
    if (auth.loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (auth.isAuthenticated) {
      return const RootScaffold();
    }
    return LoginScreen(auth: auth);
  }
}
