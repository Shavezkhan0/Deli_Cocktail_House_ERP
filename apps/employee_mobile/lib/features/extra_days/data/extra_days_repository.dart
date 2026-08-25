import 'package:dio/dio.dart';

import '../../../core/network/api_exception.dart';

class ExtraDaysRepository {
  ExtraDaysRepository(this._dio);

  final Dio _dio;

  /// GET /api/employee/salary/extra-days
  Future<ExtraDaysRecord> getExtraDays() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/employee/salary/extra-days',
      );
      return ExtraDaysRecord.fromJson(response.data!);
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

class ExtraDaysRecord {
  ExtraDaysRecord({
    required this.month,
    required this.year,
    required this.compensatoryLeaves,
    required this.availableLeaveBalance,
    required this.entries,
  });

  factory ExtraDaysRecord.fromJson(Map<String, dynamic> json) {
    return ExtraDaysRecord(
      month: json['month'] as int,
      year: json['year'] as int,
      compensatoryLeaves: (json['compensatoryLeaves'] as num).toDouble(),
      availableLeaveBalance:
          (json['availableLeaveBalance'] as num).toDouble(),
      entries: (json['entries'] as List<dynamic>)
          .map((e) => ExtraDaysEntry.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  final int month;
  final int year;
  final double compensatoryLeaves;
  final double availableLeaveBalance;
  final List<ExtraDaysEntry> entries;
}

class ExtraDaysEntry {
  ExtraDaysEntry({
    required this.date,
    required this.source,
    required this.status,
    required this.credit,
    required this.banked,
  });

  factory ExtraDaysEntry.fromJson(Map<String, dynamic> json) {
    return ExtraDaysEntry(
      date: json['date'] as String,
      source: json['source'] as String,
      status: json['status'] as String,
      credit: (json['credit'] as num).toDouble(),
      banked: json['banked'] as bool,
    );
  }

  final String date;
  final String source;
  final String status;
  final double credit;
  final bool banked;
}
