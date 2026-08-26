import 'dart:io' show Platform;

import 'package:dio/dio.dart';

class PlatformVersionInfo {
  PlatformVersionInfo({
    required this.latestVersionCode,
    required this.latestVersionName,
    required this.minSupportedVersionCode,
    this.apkUrl,
    this.releaseNotes,
  });

  factory PlatformVersionInfo.fromJson(Map<String, dynamic> json) {
    return PlatformVersionInfo(
      latestVersionCode: json['latestVersionCode'] as int,
      latestVersionName: json['latestVersionName'] as String,
      minSupportedVersionCode: json['minSupportedVersionCode'] as int,
      apkUrl: json['apkUrl'] as String?,
      releaseNotes: json['releaseNotes'] as String?,
    );
  }

  final int latestVersionCode;
  final String latestVersionName;
  final int minSupportedVersionCode;
  final String? apkUrl;
  final String? releaseNotes;
}

class UpdateRepository {
  UpdateRepository(this._dio);

  final Dio _dio;

  Future<PlatformVersionInfo?> getVersionInfo() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/app-version',
      );
      final data = response.data;
      if (data == null) return null;

      final platformKey = Platform.isAndroid ? 'android' : 'ios';
      final platformData = data[platformKey] as Map<String, dynamic>?;
      if (platformData == null) return null;

      return PlatformVersionInfo.fromJson(platformData);
    } on DioException {
      return null;
    }
  }
}
