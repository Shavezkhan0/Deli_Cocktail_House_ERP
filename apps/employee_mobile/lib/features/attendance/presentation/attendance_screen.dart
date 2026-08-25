import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
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
  @override
  Widget build(BuildContext context) {
    final todayAsync = ref.watch(todayAttendanceProvider);
    final historyAsync = ref.watch(historyProvider);
    final holidaysAsync = ref.watch(holidaysProvider);
    final officeAsync = ref.watch(officeLocationProvider);
    final markState = ref.watch(markAttendanceProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(todayAttendanceProvider);
        ref.invalidate(historyProvider);
        ref.invalidate(holidaysProvider);
        ref.invalidate(officeLocationProvider);
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Today's card
          todayAsync.when(
            loading: () => const LoadingState(itemHeight: 220),
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
            else
              _infoRow('Status', 'Remember to check out before 5:30 PM.'),
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
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: 160,
            height: 160,
            child: ElevatedButton(
              onPressed: (markState.isAcquiring || markState.isSubmitting)
                  ? null
                  : hasCheckedOut
                      ? null
                      : onMark,
              style: ElevatedButton.styleFrom(
                shape: const CircleBorder(),
                padding: EdgeInsets.zero,
                backgroundColor: hasCheckedOut
                    ? const Color(0xFF059669)
                    : hasCheckedIn
                        ? const Color(0xFF059669)
                        : AppTheme.primary,
                disabledBackgroundColor: hasCheckedOut
                    ? const Color(0xFF059669).withValues(alpha: 0.7)
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
                                : hasCheckedIn
                                    ? 'Check Out'
                                    : 'Check In',
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
        ],
      ),
    );
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
// Status badge
// ---------------------------------------------------------------------------

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final info = _statusConfig[status];
    if (info == null) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
              loading: () => const SizedBox(height: 260),
              error: (e, _) => const SizedBox(height: 80),
              data: (history) => holidaysAsync.when(
                loading: () => const SizedBox(height: 260),
                error: (e, _) => _buildGrid(year, month, leadingBlanks, daysInMonth, todayKey, {}, {}),
                data: (holidays) {
                  final recordsByDate = <String, AttendanceRecord>{};
                  for (final r in history.records) {
                    final dt = DateTime.parse(r.date);
                    final key = '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
                    recordsByDate[key] = r;
                  }
                  final holidaysByDate = <String, Holiday>{};
                  for (final h in holidays) {
                    final dt = DateTime.parse(h.date);
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
// History section (list/table)
// ---------------------------------------------------------------------------

class _HistorySection extends ConsumerWidget {
  const _HistorySection({
    required this.historyAsync,
    required this.holidaysAsync,
  });

  final AsyncValue<HistoryAttendanceResponse> historyAsync;
  final AsyncValue<List<Holiday>> holidaysAsync;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Column(
      children: [
        // History list
        historyAsync.when(
          loading: () => const LoadingState(itemHeight: 180),
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

            return Container(
              decoration: BoxDecoration(
                color: AppTheme.card,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: const BoxDecoration(
                      border: Border(bottom: BorderSide(color: AppTheme.border)),
                    ),
                    child: const Row(
                      children: [
                        Expanded(flex: 3, child: Text('Date', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.mutedForeground))),
                        Expanded(flex: 2, child: Text('In', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.mutedForeground))),
                        Expanded(flex: 2, child: Text('Out', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.mutedForeground))),
                        Expanded(flex: 2, child: Text('Status', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.mutedForeground))),
                      ],
                    ),
                  ),
                  ...history.records.map(
                    (record) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: const BoxDecoration(
                        border: Border(bottom: BorderSide(color: AppTheme.border)),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            flex: 3,
                            child: Text(formatDate(record.date), style: const TextStyle(fontSize: 12, color: AppTheme.foreground)),
                          ),
                          Expanded(
                            flex: 2,
                            child: Text(
                              record.checkInTime != null ? formatTime(record.checkInTime!) : '—',
                              style: const TextStyle(fontSize: 12, color: AppTheme.mutedForeground),
                            ),
                          ),
                          Expanded(
                            flex: 2,
                            child: Text(
                              record.checkOutTime != null ? formatTime(record.checkOutTime!) : '—',
                              style: const TextStyle(fontSize: 12, color: AppTheme.mutedForeground),
                            ),
                          ),
                          Expanded(flex: 2, child: _StatusBadge(status: record.status)),
                        ],
                      ),
                    ),
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
