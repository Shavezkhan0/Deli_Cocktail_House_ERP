import 'package:dio/dio.dart';

import '../../../core/network/api_exception.dart';

class AttendanceRepository {
  AttendanceRepository(this._dio);

  final Dio _dio;

  /// GET /api/employee/attendance/office
  /// Response: { latitude, longitude, radiusMeters, locationName } | null
  Future<OfficeLocation?> getOfficeLocation() async {
    try {
      final response = await _dio.get<dynamic>(
        '/api/employee/attendance/office',
      );
      if (response.data == null) return null;
      return OfficeLocation.fromJson(
        response.data as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// GET /api/employee/attendance/today
  /// Response: { marked: bool, attendance: AttendanceRecord | null }
  Future<TodayAttendanceResponse> getToday() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/employee/attendance/today',
      );
      return TodayAttendanceResponse.fromJson(response.data!);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// POST /api/employee/attendance/mark
  /// Body: { latitude: number, longitude: number }
  /// Response: { event: "check-in" | "check-out", attendance: AttendanceRecord }
  Future<MarkAttendanceResponse> mark({
    required double latitude,
    required double longitude,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/employee/attendance/mark',
        data: {'latitude': latitude, 'longitude': longitude},
      );
      return MarkAttendanceResponse.fromJson(response.data!);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// GET /api/employee/attendance/history?month=&year=
  /// Response: { records: AttendanceRecord[], summary: {...} }
  Future<HistoryAttendanceResponse> getHistory({
    required int month,
    required int year,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/employee/attendance/history',
        queryParameters: {'month': month, 'year': year},
      );
      return HistoryAttendanceResponse.fromJson(response.data!);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// GET /api/employee/attendance/holidays?month=&year=
  /// Response: Holiday[]
  Future<List<Holiday>> getHolidays({
    required int month,
    required int year,
  }) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/api/employee/attendance/holidays',
        queryParameters: {'month': month, 'year': year},
      );
      return (response.data ?? [])
          .map((e) => Holiday.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
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

    if (e.type == DioExceptionType.connectionError) {
      return ApiException('No internet connection. Please try again.');
    }
    return ApiException('An unexpected error occurred.');
  }
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

class OfficeLocation {
  OfficeLocation({
    required this.latitude,
    required this.longitude,
    required this.radiusMeters,
    required this.locationName,
  });

  factory OfficeLocation.fromJson(Map<String, dynamic> json) {
    return OfficeLocation(
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      radiusMeters: (json['radiusMeters'] as num).toDouble(),
      locationName: json['locationName'] as String? ?? 'Office',
    );
  }

  final double latitude;
  final double longitude;
  final double radiusMeters;
  final String locationName;
}

class TodayAttendanceResponse {
  TodayAttendanceResponse({
    required this.marked,
    this.attendance,
  });

  factory TodayAttendanceResponse.fromJson(Map<String, dynamic> json) {
    return TodayAttendanceResponse(
      marked: json['marked'] as bool,
      attendance: json['attendance'] != null
          ? AttendanceRecord.fromJson(json['attendance'] as Map<String, dynamic>)
          : null,
    );
  }

  final bool marked;
  final AttendanceRecord? attendance;
}

class MarkAttendanceResponse {
  MarkAttendanceResponse({
    required this.event,
    required this.attendance,
  });

  factory MarkAttendanceResponse.fromJson(Map<String, dynamic> json) {
    return MarkAttendanceResponse(
      event: json['event'] as String,
      attendance: AttendanceRecord.fromJson(
        json['attendance'] as Map<String, dynamic>,
      ),
    );
  }

  final String event;
  final AttendanceRecord attendance;
}

class HistoryAttendanceResponse {
  HistoryAttendanceResponse({
    required this.records,
    required this.summary,
  });

  factory HistoryAttendanceResponse.fromJson(Map<String, dynamic> json) {
    return HistoryAttendanceResponse(
      records: (json['records'] as List<dynamic>)
          .map((e) => AttendanceRecord.fromJson(e as Map<String, dynamic>))
          .toList(),
      summary: AttendanceSummary.fromJson(
        json['summary'] as Map<String, dynamic>,
      ),
    );
  }

  final List<AttendanceRecord> records;
  final AttendanceSummary summary;
}

class AttendanceSummary {
  AttendanceSummary({
    required this.present,
    required this.absent,
    required this.halfDay,
    required this.shortLeave,
    required this.onLeave,
  });

  factory AttendanceSummary.fromJson(Map<String, dynamic> json) {
    return AttendanceSummary(
      present: json['PRESENT'] as int? ?? 0,
      absent: json['ABSENT'] as int? ?? 0,
      halfDay: json['HALF_DAY'] as int? ?? 0,
      shortLeave: json['SHORT_LEAVE'] as int? ?? 0,
      onLeave: json['ON_LEAVE'] as int? ?? 0,
    );
  }

  final int present;
  final int absent;
  final int halfDay;
  final int shortLeave;
  final int onLeave;
}

class AttendanceRecord {
  AttendanceRecord({
    required this.id,
    required this.date,
    required this.status,
    this.checkInTime,
    this.checkOutTime,
    this.latitude,
    this.longitude,
    this.correctedByAdmin = false,
    this.previousStatus,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    return AttendanceRecord(
      id: json['id'] as String,
      date: json['date'] as String,
      status: json['status'] as String,
      checkInTime: json['checkInTime'] as String?,
      checkOutTime: json['checkOutTime'] as String?,
      latitude: json['latitude'] != null
          ? (json['latitude'] as num).toDouble()
          : null,
      longitude: json['longitude'] != null
          ? (json['longitude'] as num).toDouble()
          : null,
      correctedByAdmin: json['correctedByAdmin'] as bool? ?? false,
      previousStatus: json['previousStatus'] as String?,
    );
  }

  final String id;
  final String date;
  final String status;
  final String? checkInTime;
  final String? checkOutTime;
  final double? latitude;
  final double? longitude;
  final bool correctedByAdmin;
  final String? previousStatus;
}

class Holiday {
  Holiday({
    required this.id,
    required this.date,
    required this.name,
  });

  factory Holiday.fromJson(Map<String, dynamic> json) {
    return Holiday(
      id: json['id'] as String,
      date: json['date'] as String,
      name: json['name'] as String,
    );
  }

  final String id;
  final String date;
  final String name;
}
