import 'package:dio/dio.dart';

import '../../../core/network/api_exception.dart';

class ProfileRepository {
  ProfileRepository(this._dio);

  final Dio _dio;

  /// GET /api/employee/profile
  /// Response: { name, designation, email, joiningDate, baseSalary, contact }
  Future<EmployeeProfile> getProfile() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/employee/profile',
      );
      return EmployeeProfile.fromJson(response.data!);
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

class EmployeeProfile {
  EmployeeProfile({
    required this.name,
    required this.designation,
    this.email,
    required this.joiningDate,
    required this.baseSalary,
    this.contact,
  });

  factory EmployeeProfile.fromJson(Map<String, dynamic> json) {
    return EmployeeProfile(
      name: json['name'] as String,
      designation: json['designation'] as String,
      email: json['email'] as String?,
      joiningDate: json['joiningDate'] as String,
      baseSalary: (json['baseSalary'] as num).toDouble(),
      contact: json['contact'] as String?,
    );
  }

  final String name;
  final String designation;
  final String? email;
  final String joiningDate;
  final double baseSalary;
  final String? contact;
}
