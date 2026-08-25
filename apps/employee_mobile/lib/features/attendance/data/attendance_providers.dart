import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/utils/geo.dart';
import '../../auth/data/auth_provider.dart';
import 'attendance_repository.dart';

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

final attendanceRepositoryProvider = Provider<AttendanceRepository>((ref) {
  return AttendanceRepository(ref.watch(apiClientProvider).dio);
});

// ---------------------------------------------------------------------------
// Office location (fetched once, cached)
// ---------------------------------------------------------------------------

final officeLocationProvider = FutureProvider<OfficeLocation?>((ref) async {
  return ref.watch(attendanceRepositoryProvider).getOfficeLocation();
});

// ---------------------------------------------------------------------------
// Today's attendance
// ---------------------------------------------------------------------------

final todayAttendanceProvider =
    FutureProvider<TodayAttendanceResponse>((ref) async {
  return ref.watch(attendanceRepositoryProvider).getToday();
});

// ---------------------------------------------------------------------------
// History + Holidays for a given month
// ---------------------------------------------------------------------------

class MonthFilter {
  const MonthFilter({required this.month, required this.year});

  final int month;
  final int year;
}

final historyMonthProvider = StateProvider<MonthFilter>((ref) {
  final now = DateTime.now();
  return MonthFilter(month: now.month, year: now.year);
});

final historyProvider = FutureProvider<HistoryAttendanceResponse>((ref) async {
  final filter = ref.watch(historyMonthProvider);
  return ref
      .watch(attendanceRepositoryProvider)
      .getHistory(month: filter.month, year: filter.year);
});

final holidaysProvider = FutureProvider<List<Holiday>>((ref) async {
  final filter = ref.watch(historyMonthProvider);
  return ref
      .watch(attendanceRepositoryProvider)
      .getHolidays(month: filter.month, year: filter.year);
});

// ---------------------------------------------------------------------------
// Mark attendance action
// ---------------------------------------------------------------------------

class MarkAttendanceState {
  const MarkAttendanceState({
    this.isAcquiring = false,
    this.isSubmitting = false,
    this.position,
    this.error,
    this.result,
  });

  final bool isAcquiring;
  final bool isSubmitting;
  final Position? position;
  final String? error;
  final MarkAttendanceResponse? result;

  MarkAttendanceState copyWith({
    bool? isAcquiring,
    bool? isSubmitting,
    Position? position,
    String? error,
    MarkAttendanceResponse? result,
    bool clearError = false,
    bool clearResult = false,
  }) {
    return MarkAttendanceState(
      isAcquiring: isAcquiring ?? this.isAcquiring,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      position: position ?? this.position,
      error: clearError ? null : (error ?? this.error),
      result: clearResult ? null : (result ?? this.result),
    );
  }
}

class MarkAttendanceNotifier extends StateNotifier<MarkAttendanceState> {
  MarkAttendanceNotifier(this._ref) : super(const MarkAttendanceState());

  final Ref _ref;

  Future<void> markAttendance() async {
    state = state.copyWith(
      isAcquiring: true,
      clearError: true,
      clearResult: true,
    );

    try {
      // 1. Check & request permission
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        state = state.copyWith(
          isAcquiring: false,
          error: permission == LocationPermission.deniedForever
              ? 'Location permission permanently denied. Please enable it in app settings.'
              : 'Location permission denied. Please grant location access.',
        );
        return;
      }

      // 2. Get current position
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 15),
        ),
      );
      state = state.copyWith(position: position);

      // 3. Check distance against office radius
      final office = _ref.read(officeLocationProvider).valueOrNull;
      if (office != null) {
        final distance = calculateDistance(
          position.latitude,
          position.longitude,
          office.latitude,
          office.longitude,
        );
        if (distance > office.radiusMeters) {
          state = state.copyWith(
            isAcquiring: false,
            error:
                'You are ${distance.round()}m away from ${office.locationName}. '
                'You must be within ${office.radiusMeters.round()}m to mark attendance.',
          );
          return;
        }
      }

      state = state.copyWith(isAcquiring: false);

      // 4. Submit
      state = state.copyWith(isSubmitting: true);
      final result = await _ref
          .read(attendanceRepositoryProvider)
          .mark(
            latitude: position.latitude,
            longitude: position.longitude,
          );

      state = state.copyWith(isSubmitting: false, result: result);

      // Refresh today + history + holidays
      _ref.invalidate(todayAttendanceProvider);
      _ref.invalidate(historyProvider);
      _ref.invalidate(holidaysProvider);
    } catch (e) {
      state = state.copyWith(
        isAcquiring: false,
        isSubmitting: false,
        error: e.toString(),
      );
    }
  }

  void reset() {
    state = const MarkAttendanceState();
  }
}

final markAttendanceProvider =
    StateNotifierProvider<MarkAttendanceNotifier, MarkAttendanceState>(
  MarkAttendanceNotifier.new,
);
