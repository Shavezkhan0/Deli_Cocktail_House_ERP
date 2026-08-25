import 'package:dio/dio.dart';

import '../../features/auth/data/auth_repository.dart';
import '../storage/secure_storage.dart';

const _defaultBaseUrl = 'http://localhost:8000';

class ApiClient {
  ApiClient({String? baseUrl})
      : _dio = Dio(BaseOptions(
          baseUrl: baseUrl ??
              const String.fromEnvironment(
                'API_BASE_URL',
                defaultValue: _defaultBaseUrl,
              ),
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 15),
          headers: {'Content-Type': 'application/json'},
        )) {
    _dio.interceptors.add(_AuthInterceptor(_storage, this));
  }

  final Dio _dio;
  final SecureStorage _storage = SecureStorage();

  Dio get dio => _dio;
}

class _AuthInterceptor extends Interceptor {
  _AuthInterceptor(this._storage, this._apiClient);

  final SecureStorage _storage;
  final ApiClient _apiClient;

  bool _isRefreshing = false;
  final List<_PendingRequest> _pendingRequests = [];

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storage.readToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401 && !_isRetryOfAuthEndpoint(err)) {
      if (_isRefreshing) {
        _pendingRequests.add(_PendingRequest(err, handler));
        return;
      }

      _isRefreshing = true;

      try {
        final result = await AuthRepository(
          _apiClient.dio,
          _storage,
        ).refresh();

        if (result != null) {
          // Retry the original request with the new token
          final opts = err.requestOptions;
          opts.headers['Authorization'] = 'Bearer ${result.token}';

          // Also update the Riverpod session provider if it's been initialized
          // (it may not be initialized yet during the initial session restore)

          final response = await _apiClient.dio.fetch<dynamic>(opts);
          handler.resolve(response);

          // Retry all queued requests
          for (final pending in _pendingRequests) {
            pending.requestOptions.headers['Authorization'] =
                'Bearer ${result.token}';
            try {
              final resp =
                  await _apiClient.dio.fetch<dynamic>(pending.requestOptions);
              pending.handler.resolve(resp);
            } catch (e) {
              pending.handler.reject(e as DioException);
            }
          }
          _pendingRequests.clear();
        } else {
          // Refresh failed — clear session
          await _storage.clearSession();
          handler.next(err);
          _flushPendingWithError(handler);
        }
      } catch (_) {
        await _storage.clearSession();
        handler.next(err);
        _flushPendingWithError(handler);
      } finally {
        _isRefreshing = false;
      }
    } else {
      handler.next(err);
    }
  }

  bool _isRetryOfAuthEndpoint(DioException err) {
    final path = err.requestOptions.path;
    return path.contains('/request-otp') ||
        path.contains('/verify-otp') ||
        path.contains('/refresh');
  }

  void _flushPendingWithError(ErrorInterceptorHandler mainHandler) {
    for (final pending in _pendingRequests) {
      pending.handler.reject(
        DioException(
          requestOptions: pending.requestOptions,
          type: DioExceptionType.cancel,
          error: 'Session expired',
        ),
      );
    }
    _pendingRequests.clear();
  }
}

class _PendingRequest {
  _PendingRequest(this.dioException, this.handler);

  final DioException dioException;
  final ErrorInterceptorHandler handler;

  RequestOptions get requestOptions => dioException.requestOptions;
}
