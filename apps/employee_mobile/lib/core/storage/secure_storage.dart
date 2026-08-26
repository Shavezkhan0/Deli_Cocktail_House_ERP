import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _tokenKey = 'dch-employee-token';
const _employeeKey = 'dch-employee-data';
const _dismissedUpdateKey = 'dch-employee-dismissed-update';

class SecureStorage {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<void> saveSession({
    required String token,
    required Map<String, dynamic> employee,
  }) async {
    await _storage.write(key: _tokenKey, value: token);
    await _storage.write(key: _employeeKey, value: jsonEncode(employee));
  }

  Future<String?> readToken() async {
    return _storage.read(key: _tokenKey);
  }

  Future<Map<String, dynamic>?> readEmployee() async {
    final raw = await _storage.read(key: _employeeKey);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  Future<void> clearSession() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _employeeKey);
  }

  Future<void> saveDismissedUpdateVersion(int versionCode) async {
    await _storage.write(
      key: _dismissedUpdateKey,
      value: versionCode.toString(),
    );
  }

  Future<int?> readDismissedUpdateVersion() async {
    final raw = await _storage.read(key: _dismissedUpdateKey);
    if (raw == null) return null;
    return int.tryParse(raw);
  }
}
