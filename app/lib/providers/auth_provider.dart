import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/user.dart';
import '../services/api_client.dart';

class AuthProvider extends ChangeNotifier {
  AuthProvider({required ApiClient apiClient}) : _apiClient = apiClient {
    _restoreSession();
  }
  final ApiClient _apiClient;
  User? _user;
  String? _token;
  bool _loading = true;

  ApiClient get apiClient => _apiClient;

  bool get loading => _loading;
  bool get isAuthenticated => _user != null && _token != null;
  User? get user => _user;

  Future<void> _restoreSession() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final String? raw = prefs.getString('pitpc_auth');
    if (raw != null) {
      final Map<String, dynamic> data = jsonDecode(raw) as Map<String, dynamic>;
      _user = User.fromJson(data['user'] as Map<String, dynamic>);
      _token = data['access'] as String?;
      _apiClient.setToken(_token);
    }
    _loading = false;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final Map<String, dynamic> payload = {'email': email, 'password': password};
    final Map<String, dynamic> result =
        await _apiClient.post('/auth/login', body: payload) as Map<String, dynamic>;
    _user = User.fromJson(result['user'] as Map<String, dynamic>);
    _token = result['access'] as String?;
    _apiClient.setToken(_token);
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setString('pitpc_auth', jsonEncode(result));
    notifyListeners();
  }

  Future<void> logout() async {
    _user = null;
    _token = null;
    _apiClient.clearToken();
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.remove('pitpc_auth');
    notifyListeners();
  }
}
