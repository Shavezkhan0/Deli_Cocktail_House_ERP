import 'package:dio/dio.dart';

import '../../../core/network/api_exception.dart';

class SalaryRepository {
  SalaryRepository(this._dio);

  final Dio _dio;

  /// GET /api/employee/salary/current
  Future<SalaryRecord?> getCurrent() async {
    try {
      final response = await _dio.get<dynamic>('/api/employee/salary/current');
      if (response.data == null) return null;
      return SalaryRecord.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// GET /api/employee/salary/previous
  Future<SalaryRecord?> getPrevious() async {
    try {
      final response = await _dio.get<dynamic>('/api/employee/salary/previous');
      if (response.data == null) return null;
      return SalaryRecord.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// GET /api/employee/salary/history
  Future<List<SalaryRecord>> getHistory() async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/api/employee/salary/history',
      );
      return (response.data ?? [])
          .map((e) => SalaryRecord.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// GET /api/employee/salary/leave-balance
  Future<LeaveBalance> getLeaveBalance() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/employee/salary/leave-balance',
      );
      return LeaveBalance.fromJson(response.data!);
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

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

class SalaryRecord {
  SalaryRecord({
    required this.id,
    required this.month,
    required this.year,
    required this.amount,
    required this.status,
    this.paidDate,
    this.isEstimate = false,
  });

  factory SalaryRecord.fromJson(Map<String, dynamic> json) {
    return SalaryRecord(
      id: json['id'] as String,
      month: json['month'] as int,
      year: json['year'] as int,
      amount: (json['amount'] as num).toDouble(),
      status: json['status'] as String,
      paidDate: json['paidDate'] as String?,
      isEstimate: json['isEstimate'] as bool? ?? false,
    );
  }

  final String id;
  final int month;
  final int year;
  final double amount;
  final String status;
  final String? paidDate;
  final bool isEstimate;
}

class LeaveBalance {
  LeaveBalance({
    required this.month,
    required this.year,
    required this.earnedLeaves,
    required this.compensatoryLeaves,
    required this.usedLeaves,
    required this.availableLeaveBalance,
  });

  factory LeaveBalance.fallback() {
    final now = DateTime.now();
    return LeaveBalance(
      month: now.month,
      year: now.year,
      earnedLeaves: 0,
      compensatoryLeaves: 0,
      usedLeaves: 0,
      availableLeaveBalance: 0,
    );
  }

  factory LeaveBalance.fromJson(Map<String, dynamic> json) {
    return LeaveBalance(
      month: json['month'] as int,
      year: json['year'] as int,
      earnedLeaves: (json['earnedLeaves'] as num).toDouble(),
      compensatoryLeaves: (json['compensatoryLeaves'] as num).toDouble(),
      usedLeaves: (json['usedLeaves'] as num).toDouble(),
      availableLeaveBalance: (json['availableLeaveBalance'] as num).toDouble(),
    );
  }

  final int month;
  final int year;
  final double earnedLeaves;
  final double compensatoryLeaves;
  final double usedLeaves;
  final double availableLeaveBalance;
}
