import 'package:confetti/confetti.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/geo.dart';
import '../../../shared/widgets/confirm_dialog.dart';
import '../../../shared/widgets/skeleton.dart';
import '../../../shared/widgets/state_widgets.dart';
import '../../../shared/widgets/connectivity_widgets.dart';
import '../data/attendance_providers.dart';
import '../data/attendance_repository.dart';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const _statusConfig = <String, _StatusInfo>{
  'PRESENT': _StatusInfo('Present', Color(0xFF10B981)),
  'ABSENT': _StatusInfo('Absent', Color(0xFFF43F5E)),
  'HALF_DAY': _StatusInfo('Half Day', Color(0xFFF59E0B)),
  'SHORT_LEAVE': _StatusInfo('Short Leave', Color(0xFFEAB308)),
  'ON_LEAVE': _StatusInfo('On Leave', Color(0xFF3B82F6)),
};

class _StatusInfo {
  const _StatusInfo(this.label, this.color);
  final String label;
  final Color color;
}

const _holidayColor = Color(0xFF8B5CF6);

const _statusOrder = [
  'PRESENT',
  'HALF_DAY',
  'SHORT_LEAVE',
  'ON_LEAVE',
  'ABSENT',
];

// ---------------------------------------------------------------------------
// Pagination state (scoped to attendance screen)
// ---------------------------------------------------------------------------

final _pageSizeProvider = StateProvider<int?>((ref) => null);

final _pageindexProvider = StateProvider<int>((ref) => 0);

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

class AttendanceScreen extends ConsumerWidget {
  const AttendanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return const _AttendanceBody();
  }
}

class _AttendanceBody extends ConsumerStatefulWidget {
  const _AttendanceBody();

  @override
  ConsumerState<_AttendanceBody> createState() => _AttendanceBodyState();
}

class _AttendanceBodyState extends ConsumerState<_AttendanceBody> {
  late final ConfettiController _confettiController;

  @override
  void initState() {
    super.initState();
    _confettiController = ConfettiController(duration: const Duration(milliseconds: 1500));
  }

  @override
  void dispose() {
    _confettiController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final todayAsync = ref.watch(todayAttendanceProvider);
    final historyAsync = ref.watch(historyProvider);
    final holidaysAsync = ref.watch(holidaysProvider);
    final officeAsync = ref.watch(officeLocationProvider);
    final markState = ref.watch(markAttendanceProvider);

    ref.listen<MarkAttendanceState>(markAttendanceProvider, (prev, next) {
      if (prev?.result == null && next.result != null) {
        _confettiController.play();
      }
    });

    // Only treat this as a first load (full skeleton) when there's no
    // cached value yet — otherwise a background refresh (e.g. after
    // check-in/out, or pull-to-refresh) would tear down and re-render the
    // whole page every time instead of just quietly updating in place.
    final isFirstLoad = (todayAsync.isLoading && !todayAsync.hasValue) ||
        (historyAsync.isLoading && !historyAsync.hasValue) ||
        (holidaysAsync.isLoading && !holidaysAsync.hasValue);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(todayAttendanceProvider);
        ref.invalidate(historyProvider);
        ref.invalidate(holidaysProvider);
        ref.invalidate(officeLocationProvider);
      },
      child: Stack(
        children: [
          ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Show combined skeleton only on a genuine first load
              if (isFirstLoad)
                const _AttendanceSkeleton()
              else ...[
                // Today's card
                todayAsync.when(
                  loading: () => const SizedBox.shrink(),
                  error: (e, _) => isConnectionError(e)
                      ? ServerUnavailableOverlay(
                          onRetry: () => ref.invalidate(todayAttendanceProvider),
                        )
                      : ErrorState(
                          message: 'Could not load today\'s attendance.',
                          onRetry: () => ref.invalidate(todayAttendanceProvider),
                        ),
                  data: (today) => _TodayCard(
                    record: today.attendance,
                    office: officeAsync.valueOrNull,
                    markState: markState,
                    onMark: () =>
                        ref.read(markAttendanceProvider.notifier).markAttendance(),
                  ),
                ),
                const SizedBox(height: 16),

                // Calendar card
                _CalendarSection(
                  historyAsync: historyAsync,
                  holidaysAsync: holidaysAsync,
                ),
                const SizedBox(height: 16),

                // History list card
                _HistorySection(
                  historyAsync: historyAsync,
                  holidaysAsync: holidaysAsync,
                ),
              ],
            ],
          ),
          Align(
            alignment: Alignment.topCenter,
            child: ConfettiWidget(
              confettiController: _confettiController,
              blastDirectionality: BlastDirectionality.explosive,
              shouldLoop: false,
              colors: const [
                Color(0xFF10B981),
                Color(0xFF3B82F6),
                Color(0xFFF59E0B),
                Color(0xFFEC4899),
                Color(0xFF8B5CF6),
              ],
              emissionFrequency: 0.05,
              numberOfParticles: 20,
              gravity: 0.1,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Attendance page skeleton (replaces three separate LoadingStates)
// ---------------------------------------------------------------------------

class _AttendanceSkeleton extends StatelessWidget {
  const _AttendanceSkeleton();

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppTheme.surface,
      highlightColor: Colors.white,
      period: const Duration(milliseconds: 1400),
      child: Column(
        children: [
          // --- Today card skeleton ---
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              children: [
                // Two info-row placeholders
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SkeletonBox(width: 90, height: 14, borderRadius: 4),
                    const SizedBox(width: 8),
                    SkeletonBox(width: 120, height: 14, borderRadius: 4),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SkeletonBox(width: 60, height: 14, borderRadius: 4),
                    const SizedBox(width: 8),
                    SkeletonBox(width: 160, height: 14, borderRadius: 4),
                  ],
                ),
                const SizedBox(height: 16),
                // Circular check-in button placeholder
                const SkeletonBox(
                  width: 160,
                  height: 160,
                  borderRadius: 999,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // --- Calendar skeleton ---
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header line
                Row(
                  children: [
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          SkeletonBox(width: 160, height: 14, borderRadius: 4),
                          SizedBox(height: 6),
                          SkeletonBox(width: 200, height: 10, borderRadius: 4),
                        ],
                      ),
                    ),
                    SkeletonBox(width: 100, height: 28, borderRadius: 6),
                  ],
                ),
                const SizedBox(height: 16),
                // Day-of-week headers
                Row(
                  children: List.generate(
                    7,
                    (_) => const Expanded(
                      child: Center(
                        child: SkeletonBox(width: 18, height: 12, borderRadius: 4),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                // 5 rows × 7 columns of day cells
                ...List.generate(5, (_) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      children: List.generate(
                        7,
                        (_) => const Expanded(
                          child: Padding(
                            padding: EdgeInsets.symmetric(horizontal: 2),
                            child: SkeletonBox(height: 36, borderRadius: 6),
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // --- History table skeleton ---
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              children: [
                // Table header bar
                SkeletonBox(height: 18, borderRadius: 4),
                const SizedBox(height: 12),
                // 5 data rows
                ...List.generate(5, (_) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      children: [
                        const SkeletonBox(width: 96, height: 14, borderRadius: 4),
                        const SizedBox(width: 12),
                        const SkeletonBox(width: 64, height: 14, borderRadius: 4),
                        const SizedBox(width: 12),
                        const SkeletonBox(width: 64, height: 14, borderRadius: 4),
                        const SizedBox(width: 12),
                        SkeletonBox(width: 100, height: 22, borderRadius: 11),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Today card
// ---------------------------------------------------------------------------

class _TodayCard extends StatelessWidget {
  const _TodayCard({
    required this.record,
    required this.office,
    required this.markState,
    required this.onMark,
  });

  final AttendanceRecord? record;
  final OfficeLocation? office;
  final MarkAttendanceState markState;
  final VoidCallback onMark;

  bool get hasCheckedIn => record?.checkInTime != null;
  bool get hasCheckedOut => record?.checkOutTime != null;

  int get minutesSinceCheckIn {
    if (record?.checkInTime == null) return 999;
    final checkIn = DateTime.tryParse(record!.checkInTime!);
    if (checkIn == null) return 999;
    return DateTime.now().toUtc().difference(checkIn.toUtc()).inMinutes;
  }

  bool get isCheckOutLocked => hasCheckedIn && !hasCheckedOut && minutesSinceCheckIn < 15;
  int get checkoutUnlockRemainingMinutes => (15 - minutesSinceCheckIn).clamp(1, 15);
  bool get isPastCheckInWindow {
    final now = DateTime.now();
    return (now.hour * 60 + now.minute) > (14 * 60 + 30);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        children: [
          if (hasCheckedIn) ...[
            _infoRow('Checked in', formatTime(record!.checkInTime!)),
            const SizedBox(height: 4),
            if (hasCheckedOut)
              _infoRow('Checked out', formatTime(record!.checkOutTime!))
            else if (isCheckOutLocked)
              _infoRow(
                'Check-Out Lock',
                'Locked for 15m after check-in (unlocks in ${checkoutUnlockRemainingMinutes}m) to prevent accidental checkouts.',
              )
            else
              _infoRow(
                'Status',
                DateTime.now().hour > 17 ||
                        (DateTime.now().hour == 17 && DateTime.now().minute >= 30)
                    ? 'You\u2019re past checkout time \u2014 check out now to close today\u2019s attendance.'
                    : 'Check out after 5:30 PM for a full Present day \u2014 checking out earlier may mark today as Half Day or Short Leave.',
              ),
            const SizedBox(height: 8),
            if (record != null) _StatusBadge(status: record!.status),
          ] else ...[
            if (office != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.location_on, size: 14, color: AppTheme.primary),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text(
                        'Check-in location: ${office!.locationName} '
                        '(within ${office!.radiusMeters.round()}m)',
                        style: const TextStyle(fontSize: 11, color: AppTheme.mutedForeground),
                      ),
                    ),
                  ],
                ),
              ),
            if (isPastCheckInWindow)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppTheme.destructive.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.destructive.withValues(alpha: 0.2)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.access_time_filled, size: 14, color: AppTheme.destructive),
                      SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          'Attendance window closed for today. Check-in closes at 2:30 PM.',
                          style: TextStyle(fontSize: 12, color: AppTheme.destructive, fontWeight: FontWeight.w500),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: 160,
            height: 160,
            child: ElevatedButton(
              onPressed: (markState.isAcquiring || markState.isSubmitting)
                  ? null
                  : (hasCheckedOut || isCheckOutLocked || (!hasCheckedIn && isPastCheckInWindow))
                      ? null
                      : () => _handleMarkTap(context),
              style: ElevatedButton.styleFrom(
                shape: const CircleBorder(),
                padding: EdgeInsets.zero,
                backgroundColor: hasCheckedOut
                    ? const Color(0xFF059669)
                    : isCheckOutLocked
                        ? const Color(0xFF059669).withValues(alpha: 0.6)
                        : (!hasCheckedIn && isPastCheckInWindow)
                            ? Colors.grey.shade400
                            : hasCheckedIn
                                ? const Color(0xFF059669)
                                : AppTheme.primary,
                disabledBackgroundColor: hasCheckedOut
                    ? const Color(0xFF059669).withValues(alpha: 0.7)
                    : isCheckOutLocked
                        ? const Color(0xFF059669).withValues(alpha: 0.6)
                        : (!hasCheckedIn && isPastCheckInWindow)
                            ? Colors.grey.shade400
                            : hasCheckedIn
                                ? const Color(0xFF059669).withValues(alpha: 0.85)
                                : null,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (markState.isAcquiring || markState.isSubmitting)
                    const SizedBox(
                      width: 32,
                      height: 32,
                      child: CircularProgressIndicator(strokeWidth: 3, color: Colors.white),
                    )
                  else if (hasCheckedOut)
                    const Icon(Icons.check_circle, size: 36, color: Colors.white)
                  else if (isCheckOutLocked)
                    const Icon(Icons.check_circle_outline, size: 36, color: Colors.white)
                  else if (!hasCheckedIn && isPastCheckInWindow)
                    const Icon(Icons.lock_clock, size: 36, color: Colors.white)
                  else if (hasCheckedIn)
                    const Icon(Icons.logout, size: 36, color: Colors.white)
                  else
                    const Icon(Icons.login, size: 36, color: Colors.white),
                  const SizedBox(height: 8),
                  Text(
                    markState.isAcquiring
                        ? 'Acquiring GPS…'
                        : markState.isSubmitting
                            ? 'Submitting…'
                            : hasCheckedOut
                                ? 'Checked Out'
                                : isCheckOutLocked
                                    ? 'Checked In\n(Lock ${checkoutUnlockRemainingMinutes}m)'
                                    : (!hasCheckedIn && isPastCheckInWindow)
                                        ? 'Window\nClosed'
                                        : hasCheckedIn
                                            ? 'Check Out'
                                            : 'Check In',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (markState.error != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppTheme.destructive.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.destructive.withValues(alpha: 0.2)),
              ),
              child: Text(
                markState.error!,
                style: const TextStyle(color: AppTheme.destructive, fontSize: 12),
              ),
            ),
          ],
          if (markState.result != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.2)),
              ),
              child: Text(
                markState.result!.event == 'check-in'
                    ? 'Checked in for today!'
                    : 'Checked out for today!',
                style: const TextStyle(
                  color: Color(0xFF059669),
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],

          // Map preview + distance
          if (_markedPosition != null) ...[
            const SizedBox(height: 16),
            _MapPreviewCard(position: _markedPosition!),
            if (office != null) ...[
              const SizedBox(height: 10),
              _DistanceFromOffice(
                office: office!,
                position: _markedPosition!,
              ),
            ],
          ],
        ],
      ),
    );
  }

  ({double latitude, double longitude})? get _markedPosition {
    if (record?.latitude != null && record?.longitude != null) {
      return (latitude: record!.latitude!, longitude: record!.longitude!);
    }
    final pos = markState.position;
    if (pos != null) {
      return (latitude: pos.latitude, longitude: pos.longitude);
    }
    return null;
  }

  void _handleMarkTap(BuildContext context) async {
    if (!hasCheckedIn && isPastCheckInWindow) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Attendance window closed for today. Check-in closes at 2:30 PM.',
          ),
          backgroundColor: Color(0xFFE11D48),
        ),
      );
      return;
    }

    if (isCheckOutLocked) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'You just checked in at ${formatTime(record!.checkInTime!)}. Check-out is locked for 15 minutes to prevent accidental checkouts (unlocks in $checkoutUnlockRemainingMinutes min).',
          ),
          backgroundColor: const Color(0xFFD97706),
        ),
      );
      return;
    }

    final confirmed = await showConfirmDialog(
      context,
      title: hasCheckedIn ? 'Check out now?' : 'Check in now?',
      message: hasCheckedIn
          ? 'Are you sure you want to Check Out now?\n\nChecking out before 5:30 PM may reduce today\'s attendance to Half Day or Short Leave, depending on your check-in time.'
          : 'Are you sure you want to Check In now? Your current location will be recorded for attendance.',
      confirmLabel: hasCheckedIn ? 'Check Out' : 'Check In',
      confirmIcon: hasCheckedIn ? Icons.logout : Icons.login,
      destructive: hasCheckedIn,
    );
    if (confirmed) {
      onMark();
    }
  }

  Widget _infoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text('$label: ', style: const TextStyle(fontSize: 13, color: AppTheme.mutedForeground)),
        Flexible(
          child: Text(
            value,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.foreground),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Map preview card (webview_flutter)
// ---------------------------------------------------------------------------

class _MapPreviewCard extends StatefulWidget {
  const _MapPreviewCard({required this.position});

  final ({double latitude, double longitude}) position;

  @override
  State<_MapPreviewCard> createState() => _MapPreviewCardState();
}

class _MapPreviewCardState extends State<_MapPreviewCard> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();
    final lat = widget.position.latitude;
    final lon = widget.position.longitude;
    final delta = 0.002;
    final bbox =
        '${lon - delta}%2C${lat - delta / 2}%2C${lon + delta}%2C${lat + delta / 2}';
    final src =
        'https://www.openstreetmap.org/export/embed.html?bbox=$bbox&layer=mapnik&marker=$lat%2C$lon';

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadRequest(Uri.parse(src));
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 220,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.border),
        ),
        child: WebViewWidget(controller: _controller),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Distance from office chip
// ---------------------------------------------------------------------------

class _DistanceFromOffice extends StatelessWidget {
  const _DistanceFromOffice({
    required this.office,
    required this.position,
  });

  final OfficeLocation office;
  final ({double latitude, double longitude}) position;

  @override
  Widget build(BuildContext context) {
    final meters = calculateDistance(
      position.latitude,
      position.longitude,
      office.latitude,
      office.longitude,
    );
    final label = meters >= 1000
        ? '${(meters / 1000).toStringAsFixed(1)} km'
        : '${meters.round()} m';

    return Row(
      children: [
        const Icon(Icons.place_outlined, size: 14, color: AppTheme.mutedForeground),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            'Distance from ${office.locationName}',
            style: const TextStyle(fontSize: 12, color: AppTheme.mutedForeground),
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: AppTheme.foreground,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final info = _statusConfig[status];
    if (info == null) return const SizedBox.shrink();

    return FittedBox(
      fit: BoxFit.scaleDown,
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: info.color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 6, height: 6, decoration: BoxDecoration(color: info.color, shape: BoxShape.circle)),
            const SizedBox(width: 6),
            Text(info.label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: info.color)),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Calendar section
// ---------------------------------------------------------------------------

class _CalendarSection extends ConsumerWidget {
  const _CalendarSection({
    required this.historyAsync,
    required this.holidaysAsync,
  });

  final AsyncValue<HistoryAttendanceResponse> historyAsync;
  final AsyncValue<List<Holiday>> holidaysAsync;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filter = ref.watch(historyMonthProvider);
    final year = filter.year;
    final month = filter.month;

    final leadingBlanks = DateTime(year, month, 1).weekday % 7;
    final daysInMonth = DateTime(year, month + 1, 0).day;
    final today = DateTime.now();
    final todayKey = '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

    final monthLabelStr = monthLabel(month, year);

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with month selector
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Row(
              children: [
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Attendance Calendar',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.foreground),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Your day-by-day attendance for the month.',
                        style: TextStyle(fontSize: 11, color: AppTheme.mutedForeground),
                      ),
                    ],
                  ),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _MonthArrow(
                      icon: Icons.chevron_left,
                      onTap: () => _changeMonth(ref, -1),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      child: Text(
                        monthLabelStr,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.foreground,
                        ),
                      ),
                    ),
                    _MonthArrow(
                      icon: Icons.chevron_right,
                      onTap: () => _changeMonth(ref, 1),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Calendar grid
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: historyAsync.when(
              loading: () => const SizedBox.shrink(),
              error: (e, _) => const SizedBox.shrink(),
              data: (history) => holidaysAsync.when(
                loading: () => const SizedBox.shrink(),
                error: (e, _) => _buildGrid(year, month, leadingBlanks, daysInMonth, todayKey, {}, {}),
                data: (holidays) {
                  final recordsByDate = <String, AttendanceRecord>{};
                  for (final r in history.records) {
                    final dt = DateTime.parse(r.date).toLocal();
                    final key = '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
                    recordsByDate[key] = r;
                  }
                  final holidaysByDate = <String, Holiday>{};
                  for (final h in holidays) {
                    final dt = DateTime.parse(h.date).toLocal();
                    final key = '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
                    holidaysByDate[key] = h;
                  }
                  return _buildGrid(year, month, leadingBlanks, daysInMonth, todayKey, recordsByDate, holidaysByDate);
                },
              ),
            ),
          ),

          // Legend
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: historyAsync.when(
              loading: () => const SizedBox.shrink(),
              error: (e, _) => const SizedBox.shrink(),
              data: (history) => Wrap(
                spacing: 14,
                runSpacing: 8,
                children: [
                  ..._statusOrder.map((s) {
                    final info = _statusConfig[s]!;
                    return _legendDot(info.label, info.color, history.summary);
                  }),
                  _legendDotStatic('Holiday', _holidayColor),
                  _legendDotStatic('Corrected', const Color(0xFFFBBF24)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGrid(
    int year,
    int month,
    int leadingBlanks,
    int daysInMonth,
    String todayKey,
    Map<String, AttendanceRecord> recordsByDate,
    Map<String, Holiday> holidaysByDate,
  ) {
    return Column(
      children: [
        // Day headers
        Row(
          children: ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) {
            return Expanded(
              child: Center(
                child: Text(
                  d,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.mutedForeground,
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 4),

        // Calendar cells
        ...List.generate(_rowCount(leadingBlanks, daysInMonth), (row) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              children: List.generate(7, (col) {
                final index = row * 7 + col;
                final dayNum = index - leadingBlanks + 1;
                if (dayNum < 1 || dayNum > daysInMonth) {
                  return const Expanded(child: SizedBox(height: 38));
                }
                final key = _dateKey(year, month, dayNum);
                final record = recordsByDate[key];
                final holiday = holidaysByDate[key];
                final isSunday = DateTime(year, month, dayNum).weekday % 7 == 0;
                final isToday = key == todayKey;
                final isHoliday = !isSunday && holiday != null;
                final isEmpty = record == null && !isSunday && !isHoliday;

                Color? bgColor;
                if (record != null) {
                  bgColor = _statusConfig[record.status]?.color;
                } else if (isSunday || isHoliday) {
                  bgColor = _holidayColor;
                }

                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: Container(
                      height: 38,
                      decoration: BoxDecoration(
                        color: bgColor ?? AppTheme.surface,
                        borderRadius: BorderRadius.circular(6),
                        border: isToday
                            ? Border.all(color: AppTheme.primary, width: 2)
                            : null,
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Text(
                            '$dayNum',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: bgColor != null ? Colors.white : (isEmpty ? AppTheme.mutedForeground : Colors.white),
                            ),
                          ),
                          if (record?.correctedByAdmin == true)
                            Positioned(
                              top: 3,
                              right: 3,
                              child: Container(
                                width: 5,
                                height: 5,
                                decoration: const BoxDecoration(
                                  color: Color(0xFFFBBF24),
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ),
          );
        }),
      ],
    );
  }

  int _rowCount(int leadingBlanks, int daysInMonth) {
    return ((leadingBlanks + daysInMonth + 6) / 7).floor();
  }

  String _dateKey(int year, int month, int day) {
    return '$year-${month.toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}';
  }

  Widget _legendDot(String label, Color color, AttendanceSummary summary) {
    int count;
    switch (label) {
      case 'Present':
        count = summary.present;
      case 'Half Day':
        count = summary.halfDay;
      case 'Short Leave':
        count = summary.shortLeave;
      case 'On Leave':
        count = summary.onLeave;
      case 'Absent':
        count = summary.absent;
      default:
        count = 0;
    }
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(
          '$label: $count',
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: AppTheme.mutedForeground),
        ),
      ],
    );
  }

  Widget _legendDotStatic(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: AppTheme.mutedForeground),
        ),
      ],
    );
  }

  void _changeMonth(WidgetRef ref, int delta) {
    final current = ref.read(historyMonthProvider);
    var newMonth = current.month + delta;
    var newYear = current.year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    ref.read(historyMonthProvider.notifier).state =
        MonthFilter(month: newMonth, year: newYear);

    // Reset pagination when month changes
    ref.read(_pageindexProvider.notifier).state = 0;
  }
}

class _MonthArrow extends StatelessWidget {
  const _MonthArrow({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(icon, size: 18, color: AppTheme.foreground),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// History section (list/table with pagination)
// ---------------------------------------------------------------------------

class _HistorySection extends ConsumerWidget {
  const _HistorySection({
    required this.historyAsync,
    required this.holidaysAsync,
  });

  final AsyncValue<HistoryAttendanceResponse> historyAsync;
  final AsyncValue<List<Holiday>> holidaysAsync;

  // Fixed column widths that prevent _StatusBadge overflow — used only as a
  // fallback (with horizontal scroll) when the screen is too narrow to
  // stretch the columns to fill the card without squashing them.
  static const _colDate = 96.0;
  static const _colIn = 64.0;
  static const _colOut = 64.0;
  static const _colStatus = 92.0;
  static const _rowPadding = 32.0; // 16px horizontal padding on each side
  static const _minTableWidth =
      _colDate + _colIn + _colOut + _colStatus + _rowPadding;

  Widget _tableRow({
    required bool stretch,
    required Widget date,
    required Widget checkIn,
    required Widget checkOut,
    required Widget status,
    BoxDecoration? decoration,
  }) {
    Widget cell(Widget child, double width, int flex) {
      return stretch
          ? Expanded(
              flex: flex,
              child: Align(alignment: Alignment.centerLeft, child: child),
            )
          : SizedBox(width: width, child: child);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: decoration,
      child: Row(
        children: [
          cell(date, _colDate, 3),
          cell(checkIn, _colIn, 2),
          cell(checkOut, _colOut, 2),
          cell(status, _colStatus, 3),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      children: [
        // History list
        historyAsync.when(
          loading: () => const SizedBox.shrink(),
          error: (e, _) => isConnectionError(e)
              ? ServerUnavailableOverlay(
                  onRetry: () => ref.invalidate(historyProvider),
                )
              : ErrorState(
                  message: 'Could not load history.',
                  onRetry: () => ref.invalidate(historyProvider),
                ),
          data: (history) {
            if (history.records.isEmpty) {
              return const EmptyState(
                message: 'No attendance records for this month',
                sub: 'Mark your attendance to see it here.',
                icon: Icons.event_busy_rounded,
              );
            }

            // Pagination logic
            final pageSize = ref.watch(_pageSizeProvider);
            final pageIndex = ref.watch(_pageindexProvider);
            final allRecords = history.records;

            final int totalPages;
            final List<AttendanceRecord> visibleRecords;

            if (pageSize == null) {
              // Full month — show all
              totalPages = 1;
              visibleRecords = allRecords;
            } else {
              totalPages = (allRecords.length / pageSize).ceil().clamp(1, 9999);
              final start = (pageIndex * pageSize).clamp(0, allRecords.length);
              final end = (start + pageSize).clamp(0, allRecords.length);
              visibleRecords = allRecords.sublist(start, end);
            }

            return Container(
              decoration: BoxDecoration(
                color: AppTheme.card,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                children: [
                  // Page size selector
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: _PageSizeSelector(
                      pageSize: pageSize,
                      onSelected: (newSize) {
                        ref.read(_pageSizeProvider.notifier).state = newSize;
                        ref.read(_pageindexProvider.notifier).state = 0;
                      },
                    ),
                  ),

                  // Table header + data — stretches to fill the card on
                  // normal-width screens; falls back to fixed-width columns
                  // with horizontal scroll only if it genuinely can't fit.
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final stretch = constraints.maxWidth >= _minTableWidth;

                      const headerStyle = TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.mutedForeground,
                      );
                      const cellStyle = TextStyle(fontSize: 12, color: AppTheme.foreground);
                      const mutedCellStyle = TextStyle(fontSize: 12, color: AppTheme.mutedForeground);

                      final table = Column(
                        children: [
                          _tableRow(
                            stretch: stretch,
                            date: const Text('Date', style: headerStyle),
                            checkIn: const Text('In', style: headerStyle),
                            checkOut: const Text('Out', style: headerStyle),
                            status: const Text('Status', style: headerStyle),
                            decoration: const BoxDecoration(
                              border: Border(bottom: BorderSide(color: AppTheme.border)),
                            ),
                          ),
                          ...visibleRecords.map(
                            (record) => _tableRow(
                              stretch: stretch,
                              date: Text(formatDate(record.date), style: cellStyle),
                              checkIn: Text(
                                record.checkInTime != null ? formatTime(record.checkInTime!) : '—',
                                style: mutedCellStyle,
                              ),
                              checkOut: Text(
                                record.checkOutTime != null ? formatTime(record.checkOutTime!) : '—',
                                style: mutedCellStyle,
                              ),
                              status: _StatusBadge(status: record.status),
                              decoration: const BoxDecoration(
                                border: Border(bottom: BorderSide(color: AppTheme.border)),
                              ),
                            ),
                          ),
                        ],
                      );

                      if (stretch) return table;
                      return SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: table,
                      );
                    },
                  ),

                  // Pagination controls
                  if (pageSize != null && totalPages > 1)
                    _PaginationControls(
                      pageIndex: pageIndex,
                      totalPages: totalPages,
                      onPrevious: () {
                        ref.read(_pageindexProvider.notifier).state =
                            (pageIndex - 1).clamp(0, totalPages - 1);
                      },
                      onNext: () {
                        ref.read(_pageindexProvider.notifier).state =
                            (pageIndex + 1).clamp(0, totalPages - 1);
                      },
                    ),
                ],
              ),
            );
          },
        ),

        // Holidays
        const SizedBox(height: 16),
        holidaysAsync.when(
          loading: () => const SizedBox.shrink(),
          error: (e, s) => const SizedBox.shrink(),
          data: (holidays) {
            if (holidays.isEmpty) return const SizedBox.shrink();
            return Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.card,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Holidays',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.foreground),
                  ),
                  const SizedBox(height: 10),
                  ...holidays.map(
                    (h) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          const Icon(Icons.celebration, size: 14, color: Color(0xFF8B5CF6)),
                          const SizedBox(width: 8),
                          Expanded(child: Text(h.name, style: const TextStyle(fontSize: 13, color: AppTheme.foreground))),
                          Text(formatDate(h.date), style: const TextStyle(fontSize: 11, color: AppTheme.mutedForeground)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Page size selector (pill/chip toggle)
// ---------------------------------------------------------------------------

class _PageSizeSelector extends StatelessWidget {
  const _PageSizeSelector({
    required this.pageSize,
    required this.onSelected,
  });

  final int? pageSize;
  final ValueChanged<int?> onSelected;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Text(
          'Show:',
          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.mutedForeground),
        ),
        const SizedBox(width: 8),
        _PillChip(
          label: '10',
          selected: pageSize == 10,
          onTap: () => onSelected(10),
        ),
        const SizedBox(width: 6),
        _PillChip(
          label: '20',
          selected: pageSize == 20,
          onTap: () => onSelected(20),
        ),
        const SizedBox(width: 6),
        _PillChip(
          label: 'Full month',
          selected: pageSize == null,
          onTap: () => onSelected(null),
        ),
      ],
    );
  }
}

class _PillChip extends StatelessWidget {
  const _PillChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppTheme.primary : AppTheme.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? AppTheme.primary : AppTheme.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: selected ? AppTheme.primaryForeground : AppTheme.mutedForeground,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Pagination controls (Previous / Page X of Y / Next)
// ---------------------------------------------------------------------------

class _PaginationControls extends StatelessWidget {
  const _PaginationControls({
    required this.pageIndex,
    required this.totalPages,
    required this.onPrevious,
    required this.onNext,
  });

  final int pageIndex;
  final int totalPages;
  final VoidCallback onPrevious;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: AppTheme.border)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _NavButton(
            label: 'Previous',
            enabled: pageIndex > 0,
            onTap: onPrevious,
          ),
          const SizedBox(width: 16),
          Text(
            'Page ${pageIndex + 1} of $totalPages',
            style: const TextStyle(fontSize: 12, color: AppTheme.mutedForeground),
          ),
          const SizedBox(width: 16),
          _NavButton(
            label: 'Next',
            enabled: pageIndex < totalPages - 1,
            onTap: onNext,
          ),
        ],
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  const _NavButton({
    required this.label,
    required this.enabled,
    required this.onTap,
  });

  final String label;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: enabled ? AppTheme.surface : AppTheme.surface.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(
            color: enabled ? AppTheme.border : AppTheme.border.withValues(alpha: 0.5),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: enabled ? AppTheme.foreground : AppTheme.mutedForeground.withValues(alpha: 0.5),
          ),
        ),
      ),
    );
  }
}
