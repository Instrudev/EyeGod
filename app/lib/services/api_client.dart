import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiClient {
  factory ApiClient() => _instance;

  ApiClient._internal();

  static final ApiClient _instance = ApiClient._internal();

  final String baseUrl = const String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://localhost:8000/api',
  );
  String? _token;

  void setToken(String? token) {
    _token = token;
  }

  void clearToken() {
    _token = null;
  }

  Map<String, String> _headers([Map<String, String>? extra]) {
    final Map<String, String> headers = {
      'Content-Type': 'application/json',
      if (_token != null) 'Authorization': 'Bearer $_token',
      ...?extra,
    };
    return headers;
  }

  Uri _url(String path, [Map<String, dynamic>? queryParams]) {
    return Uri.parse('$baseUrl$path').replace(
      queryParameters: queryParams?.map((key, value) => MapEntry(key, '$value')),
    );
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) async {
    final http.Response response = await http.get(_url(path, query), headers: _headers());
    return _decodeResponse(response);
  }

  Future<dynamic> post(String path, {Map<String, dynamic>? body}) async {
    final http.Response response = await http.post(
      _url(path),
      headers: _headers(),
      body: jsonEncode(body ?? <String, dynamic>{}),
    );
    return _decodeResponse(response);
  }

  Future<dynamic> put(String path, {Map<String, dynamic>? body}) async {
    final http.Response response = await http.put(
      _url(path),
      headers: _headers(),
      body: jsonEncode(body ?? <String, dynamic>{}),
    );
    return _decodeResponse(response);
  }

  Future<dynamic> delete(String path) async {
    final http.Response response = await http.delete(_url(path), headers: _headers());
    return _decodeResponse(response);
  }

  dynamic _decodeResponse(http.Response response) {
    final int status = response.statusCode;
    if (status >= 200 && status < 300) {
      if (response.body.isEmpty) return null;
      return jsonDecode(utf8.decode(response.bodyBytes));
    }
    throw ApiException(status: status, body: response.body);
  }
}

class ApiException implements Exception {
  ApiException({required this.status, required this.body});
  final int status;
  final String body;

  @override
  String toString() => 'ApiException(status: $status, body: $body)';
}
