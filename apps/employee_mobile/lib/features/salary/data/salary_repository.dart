import 'dart:io';

import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';

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

  /// GET /api/employee/salary/breakdown
  Future<SalaryBreakdown> getBreakdown({
    required int month,
    required int year,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/employee/salary/breakdown',
        queryParameters: {'month': month, 'year': year},
      );
      return SalaryBreakdown.fromJson(response.data!);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// GET /api/employee/salary/slip — downloads the salary slip PDF to a
  /// temporary file and returns its path for the caller to open.
  Future<String> downloadSlip({
    required int month,
    required int year,
  }) async {
    try {
      final res = await _dio.get<List<int>>(
        '/api/employee/salary/slip',
        queryParameters: {'month': month, 'year': year},
        options: Options(responseType: ResponseType.bytes),
      );
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/salary-slip-$year-$month.pdf');
      await file.writeAsBytes(res.data!);
      return file.path;
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
    this.paidLeaveAvailable = 0,
    this.paidLeaveUsedThisMonth = 0,
    this.paidLeaveClosing = 0,
    this.shortLeaveAllowance = 0,
    this.shortLeaveUsed = 0,
    this.shortLeaveRemaining = 0,
    this.holidayWorkExtraDays = 0,
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
    final paidLeave = json['paidLeave'] as Map<String, dynamic>?;
    final shortLeave = json['shortLeave'] as Map<String, dynamic>?;
    final holidayWork = json['holidayWork'] as Map<String, dynamic>?;

    double numFrom(Object? value) {
      if (value is num) return value.toDouble();
      return 0;
    }

    return LeaveBalance(
      month: json['month'] as int,
      year: json['year'] as int,
      earnedLeaves: (json['earnedLeaves'] as num).toDouble(),
      compensatoryLeaves: (json['compensatoryLeaves'] as num).toDouble(),
      usedLeaves: (json['usedLeaves'] as num).toDouble(),
      availableLeaveBalance: (json['availableLeaveBalance'] as num).toDouble(),
      paidLeaveAvailable:
          paidLeave != null ? numFrom(paidLeave['available']) : numFrom(json['availableLeaveBalance']),
      paidLeaveUsedThisMonth:
          paidLeave != null ? numFrom(paidLeave['usedThisMonth']) : numFrom(json['usedLeaves']),
      paidLeaveClosing:
          paidLeave != null ? numFrom(paidLeave['closing']) : 0,
      shortLeaveAllowance:
          shortLeave != null ? numFrom(shortLeave['allowance']) : 0,
      shortLeaveUsed:
          shortLeave != null ? numFrom(shortLeave['usedThisMonth']) : 0,
      shortLeaveRemaining:
          shortLeave != null ? numFrom(shortLeave['remaining']) : 0,
      holidayWorkExtraDays:
          holidayWork != null ? numFrom(holidayWork['extraDays']) : 0,
    );
  }

  final int month;
  final int year;
  final double earnedLeaves;
  final double compensatoryLeaves;
  final double usedLeaves;
  final double availableLeaveBalance;
  final double paidLeaveAvailable;
  final double paidLeaveUsedThisMonth;
  final double paidLeaveClosing;
  final double shortLeaveAllowance;
  final double shortLeaveUsed;
  final double shortLeaveRemaining;
  final double holidayWorkExtraDays;
}

class SalaryBreakdown {
  SalaryBreakdown({
    required this.month,
    required this.year,
    required this.baseSalary,
    required this.daysInMonth,
    required this.dailyWage,
    required this.eligibleForLeaves,
    required this.eligibleFrom,
    required this.attendance,
    required this.paidLeave,
    required this.shortLeave,
    required this.holidayWorkExtraDays,
    required this.holidayWorkEntries,
    required this.deductionAmount,
    required this.extraEarnings,
    required this.extraExpenses,
    required this.finalAmount,
  });

  factory SalaryBreakdown.fromJson(Map<String, dynamic> json) {
    double? numFrom(Object? value) {
      if (value is num) return value.toDouble();
      if (value is String) return double.tryParse(value);
      return null;
    }

    int intFrom(Object? value) {
      if (value is num) return value.toInt();
      if (value is String) return int.tryParse(value) ?? 0;
      return 0;
    }

    final attendanceJson = json['attendance'] as Map<String, dynamic>?;
    final paidLeaveJson = json['paidLeave'] as Map<String, dynamic>?;
    final shortLeaveJson = json['shortLeave'] as Map<String, dynamic>?;
    final holidayWorkJson = json['holidayWork'] as Map<String, dynamic>?;
    final holidayEntries = holidayWorkJson?['entries'] as List<dynamic>? ?? [];

    return SalaryBreakdown(
      month: intFrom(json['month']),
      year: intFrom(json['year']),
      baseSalary: numFrom(json['baseSalary']) ?? 0,
      daysInMonth: numFrom(json['daysInMonth']) ?? 0,
      dailyWage: numFrom(json['dailyWage']) ?? 0,
      eligibleForLeaves: json['eligibleForLeaves'] as bool? ?? false,
      eligibleFrom: json['eligibleFrom'] as String? ?? '',
      attendance: Attendance.fromJson(attendanceJson ?? const {}),
      paidLeave: PaidLeave.fromJson(paidLeaveJson ?? const {}),
      shortLeave: ShortLeaveInfo.fromJson(shortLeaveJson ?? const {}),
      holidayWorkExtraDays: numFrom(holidayWorkJson?['extraDays']) ?? 0,
      holidayWorkEntries: holidayEntries
          .map((e) => HolidayWorkEntry.fromJson(e as Map<String, dynamic>))
          .toList(),
      deductionAmount: numFrom(json['deductionAmount']) ?? 0,
      extraEarnings: numFrom(json['extraEarnings']) ?? 0,
      extraExpenses: numFrom(json['extraExpenses']) ?? 0,
      finalAmount: numFrom(json['finalAmount']) ?? 0,
    );
  }

  final int month;
  final int year;
  final double baseSalary;
  final double daysInMonth;
  final double dailyWage;
  final bool eligibleForLeaves;
  final String eligibleFrom;
  final Attendance attendance;
  final PaidLeave paidLeave;
  final ShortLeaveInfo shortLeave;
  final double holidayWorkExtraDays;
  final List<HolidayWorkEntry> holidayWorkEntries;
  final double deductionAmount;
  final double extraEarnings;
  final double extraExpenses;
  final double finalAmount;
}

class Attendance {
  Attendance({
    required this.present,
    required this.absent,
    required this.onLeave,
    required this.halfDay,
    required this.shortLeave,
  });

  factory Attendance.fromJson(Map<String, dynamic> json) {
    int intFrom(Object? value) {
      if (value is num) return value.toInt();
      if (value is String) return int.tryParse(value) ?? 0;
      return 0;
    }

    return Attendance(
      present: intFrom(json['PRESENT']),
      absent: intFrom(json['ABSENT']),
      onLeave: intFrom(json['ON_LEAVE']),
      halfDay: intFrom(json['HALF_DAY']),
      shortLeave: intFrom(json['SHORT_LEAVE']),
    );
  }

  final int present;
  final int absent;
  final int onLeave;
  final int halfDay;
  final int shortLeave;
}

class PaidLeave {
  PaidLeave({
    required this.opening,
    required this.grantedThisMonth,
    required this.available,
    required this.usedThisMonth,
    required this.overageDays,
    required this.closing,
  });

  factory PaidLeave.fromJson(Map<String, dynamic> json) {
    double numFrom(Object? value) {
      if (value is num) return value.toDouble();
      if (value is String) return double.tryParse(value) ?? 0;
      return 0;
    }

    return PaidLeave(
      opening: numFrom(json['opening']),
      grantedThisMonth: numFrom(json['grantedThisMonth']),
      available: numFrom(json['available']),
      usedThisMonth: numFrom(json['usedThisMonth']),
      overageDays: numFrom(json['overageDays']),
      closing: numFrom(json['closing']),
    );
  }

  final double opening;
  final double grantedThisMonth;
  final double available;
  final double usedThisMonth;
  final double overageDays;
  final double closing;
}

class ShortLeaveInfo {
  ShortLeaveInfo({
    required this.allowance,
    required this.usedThisMonth,
    required this.remaining,
    required this.overageDays,
  });

  factory ShortLeaveInfo.fromJson(Map<String, dynamic> json) {
    double numFrom(Object? value) {
      if (value is num) return value.toDouble();
      if (value is String) return double.tryParse(value) ?? 0;
      return 0;
    }

    return ShortLeaveInfo(
      allowance: numFrom(json['allowance']),
      usedThisMonth: numFrom(json['usedThisMonth']),
      remaining: numFrom(json['remaining']),
      overageDays: numFrom(json['overageDays']),
    );
  }

  final double allowance;
  final double usedThisMonth;
  final double remaining;
  final double overageDays;
}

class HolidayWorkEntry {
  HolidayWorkEntry({
    required this.date,
    required this.label,
    required this.credit,
  });

  factory HolidayWorkEntry.fromJson(Map<String, dynamic> json) {
    final credit = json['credit'];
    return HolidayWorkEntry(
      date: json['date'] as String? ?? '',
      label: json['label'] as String? ?? '',
      credit: credit is num
          ? credit.toDouble()
          : credit is String
              ? double.tryParse(credit) ?? 0
              : 0,
    );
  }

  final String date;
  final String label;
  final double credit;
}
