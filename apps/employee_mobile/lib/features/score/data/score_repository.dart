import 'package:dio/dio.dart';

import '../../../core/network/api_exception.dart';

class ScoreRepository {
  ScoreRepository(this._dio);

  final Dio _dio;

  /// GET /api/employee/score/current
  Future<WeeklyScore?> getCurrent() async {
    try {
      final response = await _dio.get<dynamic>('/api/employee/score/current');
      if (response.data == null) return null;
      return WeeklyScore.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// GET /api/employee/score/history
  Future<List<WeeklyScore>> getHistory() async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/api/employee/score/history',
      );
      return (response.data ?? [])
          .map((e) => WeeklyScore.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  ApiException _handleError(DioException e) {
    if (e.response != null) {
      final statusCode = e.response!.statusCode;
      String message;
      try {
        final body = e.response!.data;
        message = (body is Map<String, dynamic>)
            ? body['message'] as String? ?? 'Request failed'
            : 'Request failed with status $statusCode';
      } catch (_) {
        message = 'Request failed with status $statusCode';
      }
      return ApiException(message, statusCode: statusCode);
    }
    if (e.type == DioExceptionType.connectionError) {
      return ApiException('No internet connection. Please try again.');
    }
    return ApiException('An unexpected error occurred.');
  }
}

class WeeklyScore {
  WeeklyScore({
    required this.id,
    required this.weekStart,
    required this.score,
    this.notes,
  });

  factory WeeklyScore.fromJson(Map<String, dynamic> json) {
    return WeeklyScore(
      id: json['id'] as String,
      weekStart: json['weekStart'] as String,
      score: json['score'] as int,
      notes: json['notes'] as String?,
    );
  }

  final String id;
  final String weekStart;
  final int score;
  final String? notes;
}
