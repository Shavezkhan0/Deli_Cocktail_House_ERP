import 'package:dio/dio.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/storage/secure_storage.dart';

class AuthRepository {
  AuthRepository(this._dio, this._storage);

  final Dio _dio;
  final SecureStorage _storage;

  /// POST /api/employee/request-otp
  /// Body: { "email": "..." }
  /// Response 200: { "message": "...", "email": "..." }
  Future<void> requestOtp(String email) async {
    try {
      _dio.post<Map<String, dynamic>>(
        '/api/employee/request-otp',
        data: {'email': email},
      );
      // 200 OK — OTP sent
      return;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// POST /api/employee/verify-otp
  /// Body: `email`, `otp`
  /// Response 200: { "token": "...", "employee": { "id", "name", "designation", "email" } }
  Future<VerifyOtpResult> verifyOtp(String email, String otp) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/employee/verify-otp',
        data: {'email': email, 'otp': otp},
      );

      final data = response.data!;
      final token = data['token'] as String;
      final employee = data['employee'] as Map<String, dynamic>;

      await _storage.saveSession(token: token, employee: employee);

      return VerifyOtpResult(token: token, employee: employee);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// POST /api/employee/refresh
  /// Header: Authorization: Bearer token
  /// Response 200: { "token": "...", "employee": { "id", "name", "designation", "email" } }
  /// Returns null if refresh fails (caller should clear session).
  Future<VerifyOtpResult?> refresh() async {
    final token = await _storage.readToken();
    if (token == null) return null;

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/employee/refresh',
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      final data = response.data!;
      final newToken = data['token'] as String;
      final employee = data['employee'] as Map<String, dynamic>;

      await _storage.saveSession(token: newToken, employee: employee);

      return VerifyOtpResult(token: newToken, employee: employee);
    } on DioException {
      return null;
    }
  }

  ApiException _handleError(DioException e) {
    if (e.response != null) {
      final statusCode = e.response!.statusCode;
      String message;
      String? code;

      try {
        final body = e.response!.data;
        if (body is Map<String, dynamic>) {
          message = body['message'] as String? ?? 'Request failed';
          code = body['error'] as String?;
        } else {
          message = 'Request failed with status $statusCode';
        }
      } catch (_) {
        message = 'Request failed with status $statusCode';
      }

      return ApiException(message, statusCode: statusCode, code: code);
    }

    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return ApiException('Connection timed out. Please try again.');
    }
    if (e.type == DioExceptionType.connectionError) {
      return ApiException('No internet connection. Please try again.');
    }

    return ApiException('An unexpected error occurred.');
  }
}

class VerifyOtpResult {
  VerifyOtpResult({required this.token, required this.employee});

  final String token;
  final Map<String, dynamic> employee;
}
