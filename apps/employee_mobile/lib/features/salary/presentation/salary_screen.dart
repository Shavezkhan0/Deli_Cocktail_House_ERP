import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:open_filex/open_filex.dart';
import 'package:shimmer/shimmer.dart';

import '../../auth/data/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../shared/widgets/app_toast.dart';
import '../../../shared/widgets/skeleton.dart';
import '../../../shared/widgets/state_widgets.dart';
import '../../../shared/widgets/connectivity_widgets.dart';
import '../data/salary_repository.dart';

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

final salaryRepositoryProvider = Provider<SalaryRepository>((ref) {
  return SalaryRepository(ref.watch(apiClientProvider).dio);
});

final selectedMonthProvider = StateProvider<int>((ref) => DateTime.now().month);
final selectedYearProvider = StateProvider<int>((ref) => DateTime.now().year);

final salaryBreakdownProvider = FutureProvider<SalaryBreakdown>((ref) {
  final month = ref.watch(selectedMonthProvider);
  final year = ref.watch(selectedYearProvider);
  return ref
      .watch(salaryRepositoryProvider)
      .getBreakdown(month: month, year: year);
});

class SalaryData {
  SalaryData({
    required this.current,
    required this.previous,
    required this.history,
    required this.leaveBalance,
  });

  final SalaryRecord? current;
  final SalaryRecord? previous;
  final List<SalaryRecord> history;
  final LeaveBalance? leaveBalance;
}

final salaryProvider = FutureProvider<SalaryData>((ref) async {
  final repo = ref.watch(salaryRepositoryProvider);
  final results = await Future.wait([
    repo.getCurrent(),
    repo.getPrevious(),
    repo.getHistory(),
    repo.getLeaveBalance().catchError((_) => LeaveBalance.fallback()),
  ]);
  return SalaryData(
    current: results[0] as SalaryRecord?,
    previous: results[1] as SalaryRecord?,
    history: results[2] as List<SalaryRecord>,
    leaveBalance: results[3] as LeaveBalance?,
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

class SalaryScreen extends ConsumerWidget {
  const SalaryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final salaryAsync = ref.watch(salaryProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(salaryProvider);
        await ref.read(salaryProvider.future);
      },
      child: salaryAsync.when(
        loading: () => const _SalarySkeleton(),
        error: (e, _) => isConnectionError(e)
            ? ServerUnavailableOverlay(
                onRetry: () => ref.invalidate(salaryProvider),
              )
            : ErrorState(
                message: 'Could not load your salary.',
                onRetry: () => ref.invalidate(salaryProvider),
              ),
        data: (data) => _SalaryBody(data: data),
      ),
    );
  }
}

class _SalaryBody extends ConsumerStatefulWidget {
  const _SalaryBody({required this.data});

  final SalaryData data;

  @override
  ConsumerState<_SalaryBody> createState() => _SalaryBodyState();
}

class _SalaryBodyState extends ConsumerState<_SalaryBody> {
  bool _downloading = false;

  Future<void> _downloadSlip(int month, int year) async {
    if (_downloading) return;
    setState(() => _downloading = true);
    try {
      final repo = ref.read(salaryRepositoryProvider);
      final path = await repo.downloadSlip(month: month, year: year);
      final result = await OpenFilex.open(path);
      if (result.type != ResultType.done && mounted) {
        showTopToast(
          context,
          'Could not open the salary slip: ${result.message}',
          isError: true,
        );
      }
    } catch (e) {
      if (mounted) {
        showTopToast(context, 'Could not download salary slip. ($e)', isError: true);
      }
    } finally {
      if (mounted) {
        setState(() => _downloading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = widget.data;
    // Merge previous into history if not already present (matches web app)
    final allHistory = [...data.history];
    if (data.previous != null &&
        !allHistory.any((r) => r.id == data.previous!.id)) {
      allHistory.insert(0, data.previous!);
    }

    final selectedMonth = ref.watch(selectedMonthProvider);
    final selectedYear = ref.watch(selectedYearProvider);
    final breakdownAsync = ref.watch(salaryBreakdownProvider);
    final now = DateTime.now();

    // Last ~12 months ending at the current month.
    final monthOptions = List.generate(12, (index) {
      final offset = 11 - index;
      final date = DateTime(now.year, now.month - offset, 1);
      return (month: date.month, year: date.year);
    });

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Month / year selector + download button
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
              const Text(
                'Download Salary Slip',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.foreground,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<int>(
                      initialValue: selectedMonth,
                      items: monthOptions
                          .map(
                            (option) => DropdownMenuItem(
                              value: option.month,
                              child: Text(
                                monthLabel(option.month, option.year),
                                style: const TextStyle(fontSize: 13),
                              ),
                            ),
                          )
                          .toList(),
                      onChanged: (value) {
                        if (value != null) {
                          final option = monthOptions.firstWhere(
                            (o) => o.month == value,
                          );
                          ref
                              .read(selectedMonthProvider.notifier)
                              .state = option.month;
                          ref
                              .read(selectedYearProvider.notifier)
                              .state = option.year;
                        }
                      },
                      decoration: const InputDecoration(
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                        border: OutlineInputBorder(),
                      ),
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppTheme.foreground,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  SizedBox(
                    height: 44,
                    child: FilledButton.icon(
                      onPressed: _downloading
                          ? null
                          : () => _downloadSlip(selectedMonth, selectedYear),
                      icon: _downloading
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppTheme.primaryForeground,
                              ),
                            )
                          : const Icon(Icons.download_rounded, size: 18),
                      label: const Text('Download'),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        foregroundColor: AppTheme.primaryForeground,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Current month card
        _CurrentMonthCard(record: data.current),
        const SizedBox(height: 16),

        // Salary calculation for the selected month/year
        breakdownAsync.when(
          loading: () => Shimmer.fromColors(
            baseColor: AppTheme.surface,
            highlightColor: Colors.white,
            period: const Duration(milliseconds: 1400),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.border),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonBox(width: 140, height: 14, borderRadius: 4),
                  SizedBox(height: 6),
                  SkeletonBox(width: 200, height: 10, borderRadius: 4),
                  SizedBox(height: 16),
                  SkeletonBox(height: 14, borderRadius: 4),
                  SizedBox(height: 10),
                  SkeletonBox(height: 14, borderRadius: 4),
                  SizedBox(height: 10),
                  SkeletonBox(height: 14, borderRadius: 4),
                  SizedBox(height: 10),
                  SkeletonBox(width: 180, height: 14, borderRadius: 4),
                ],
              ),
            ),
          ),
          error: (e, _) => ErrorState(
            message: 'Could not load salary calculation.',
            onRetry: () => ref.invalidate(salaryBreakdownProvider),
          ),
          data: (breakdown) => _SalaryCalculationCard(breakdown: breakdown),
        ),
        const SizedBox(height: 16),

        // Leave balance card
        if (data.leaveBalance != null) ...[
          _LeaveBalanceCard(balance: data.leaveBalance!),
          const SizedBox(height: 16),
        ],

        // History section
        _HistorySection(records: allHistory),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Salary page skeleton
// ---------------------------------------------------------------------------

class _SalarySkeleton extends StatelessWidget {
  const _SalarySkeleton();

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppTheme.surface,
      highlightColor: Colors.white,
      period: const Duration(milliseconds: 1400),
      child: ListView(
        padding: const EdgeInsets.all(16),
        physics: const NeverScrollableScrollPhysics(),
        children: [
          // --- Current salary card skeleton ---
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header: icon + title
                Row(
                  children: [
                    const SkeletonBox(width: 36, height: 36, borderRadius: 10),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          SkeletonBox(width: 140, height: 14, borderRadius: 4),
                          SizedBox(height: 6),
                          SkeletonBox(width: 100, height: 10, borderRadius: 4),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                // Large amount
                const SkeletonBox(width: 180, height: 32, borderRadius: 6),
                const SizedBox(height: 12),
                // Status badge + paid date
                Row(
                  children: const [
                    SkeletonBox(width: 72, height: 22, borderRadius: 11),
                    SizedBox(width: 10),
                    SkeletonBox(width: 120, height: 12, borderRadius: 4),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // --- Leave balance card skeleton ---
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header: icon + title
                Row(
                  children: const [
                    SkeletonBox(width: 36, height: 36, borderRadius: 10),
                    SizedBox(width: 12),
                    SkeletonBox(width: 200, height: 14, borderRadius: 4),
                  ],
                ),
                const SizedBox(height: 16),
                // 4 stat boxes
                Row(
                  children: List.generate(
                    4,
                    (_) => Expanded(
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 6),
                        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                        decoration: BoxDecoration(
                          color: AppTheme.surface,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          children: const [
                            SkeletonBox(width: 30, height: 18, borderRadius: 4),
                            SizedBox(height: 6),
                            SkeletonBox(width: 40, height: 10, borderRadius: 4),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // --- History section skeleton ---
          Container(
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SkeletonBox(width: 120, height: 14, borderRadius: 4),
                      SizedBox(height: 6),
                      SkeletonBox(width: 180, height: 10, borderRadius: 4),
                    ],
                  ),
                ),
                // 4 history rows
                ...List.generate(4, (_) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: const BoxDecoration(
                      border: Border(top: BorderSide(color: AppTheme.border)),
                    ),
                    child: Row(
                      children: const [
                        Expanded(
                          flex: 3,
                          child: SkeletonBox(height: 14, borderRadius: 4),
                        ),
                        SizedBox(width: 12),
                        Expanded(
                          flex: 2,
                          child: SkeletonBox(height: 14, borderRadius: 4),
                        ),
                        SizedBox(width: 12),
                        Expanded(
                          flex: 2,
                          child: SkeletonBox(width: 64, height: 22, borderRadius: 11),
                        ),
                        SizedBox(width: 12),
                        Expanded(
                          flex: 2,
                          child: SkeletonBox(height: 12, borderRadius: 4),
                        ),
                        SizedBox(width: 8),
                        SkeletonBox(width: 16, height: 16, borderRadius: 4),
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
// Current month card
// ---------------------------------------------------------------------------

class _CurrentMonthCard extends StatelessWidget {
  const _CurrentMonthCard({required this.record});

  final SalaryRecord? record;

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final currentMonthLabel = monthLabel(now.month, now.year);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: const Color(0xFF8B5CF6).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.account_balance_rounded,
                  size: 18,
                  color: Color(0xFF8B5CF6),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "This Month's Salary",
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.foreground,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      currentMonthLabel,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          if (record != null) ...[
            // Amount
            Text(
              formatCurrency(record!.amount),
              style: const TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.w800,
                color: AppTheme.foreground,
              ),
            ),
            const SizedBox(height: 12),

            if (record!.isEstimate) ...[
              Row(
                children: [
                  _StatusBadge(status: 'ESTIMATE'),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Text(
                      'Calculated from attendance and leaves. Final salary will appear once published.',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ),
                ],
              ),
            ] else ...[
              Row(
                children: [
                  _StatusBadge(status: record!.status),
                  const SizedBox(width: 10),
                  Text(
                    record!.paidDate != null
                        ? 'Paid on ${formatDate(record!.paidDate!)}'
                        : 'Payment is pending',
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppTheme.mutedForeground,
                    ),
                  ),
                ],
              ),
            ],
          ] else ...[
            const Text(
              'No salary record for this month yet. Your salary will appear here once it is published.',
              style: TextStyle(
                fontSize: 13,
                color: AppTheme.mutedForeground,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Leave balance card
// ---------------------------------------------------------------------------

class _LeaveBalanceCard extends StatelessWidget {
  const _LeaveBalanceCard({required this.balance});

  final LeaveBalance balance;

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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: const Color(0xFF0EA5E9).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.event_available_rounded,
                  size: 18,
                  color: Color(0xFF0EA5E9),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'Leave Balance — ${monthLabel(balance.month, balance.year)}',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.foreground,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _LeaveStat(
                label: 'Paid Available',
                value: balance.paidLeaveAvailable,
                color: const Color(0xFF10B981),
              ),
              const SizedBox(width: 12),
              _LeaveStat(
                label: 'Used (mo)',
                value: balance.paidLeaveUsedThisMonth,
                color: const Color(0xFFF59E0B),
              ),
              const SizedBox(width: 12),
              _LeaveStat(
                label: 'Carried Fwd',
                value: balance.paidLeaveClosing,
                color: const Color(0xFF6366F1),
              ),
              const SizedBox(width: 12),
              _LeaveStat(
                label: 'Short Left',
                valueString:
                    '${_formatStat(balance.shortLeaveRemaining)}/${_formatStat(balance.shortLeaveAllowance)}',
                color: const Color(0xFF8B5CF6),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _LeaveStat extends StatelessWidget {
  const _LeaveStat({
    required this.label,
    this.value,
    this.valueString,
    required this.color,
  });

  final String label;
  final double? value;
  final String? valueString;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final display =
        valueString ?? (value == null ? '0' : _formatStat(value!));
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Text(
              display,
              style: TextStyle(
                fontSize: valueString != null ? 14 : 18,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: AppTheme.mutedForeground,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _formatStat(double value) {
  return value == value.roundToDouble()
      ? value.toInt().toString()
      : value.toStringAsFixed(1);
}

// ---------------------------------------------------------------------------
// Salary calculation card
// ---------------------------------------------------------------------------

const _earningsColor = Color(0xFF10B981);
const _deductionColor = Color(0xFFDC2626);
const _mutedStyle = TextStyle(fontSize: 11, color: AppTheme.mutedForeground);

class _SalaryCalculationCard extends StatelessWidget {
  const _SalaryCalculationCard({required this.breakdown});

  final SalaryBreakdown breakdown;

  @override
  Widget build(BuildContext context) {
    final b = breakdown;
    final showEarnings = b.holidayWorkExtraDays > 0 || b.extraExpenses > 0;
    final showDeductions =
        b.paidLeave.overageDays > 0 || b.shortLeave.overageDays > 0;

    final attendanceLine = 'Attendance: ${b.attendance.present} present · '
        '${b.attendance.halfDay} half · ${b.attendance.shortLeave} short · '
        '${b.attendance.onLeave} on leave · ${b.attendance.absent} absent';
    final paidLeaveLine = 'Paid leave: ${_jsNum(b.paidLeave.available)} available '
        '(${_jsNum(b.paidLeave.opening)} carried + '
        '${_jsNum(b.paidLeave.grantedThisMonth)} earned) · '
        '${_jsNum(b.paidLeave.usedThisMonth)} used · '
        '${_jsNum(b.paidLeave.closing)} carried forward'
        '${b.eligibleForLeaves ? '' : ' · accrual starts ${b.eligibleFrom}'}';
    final shortLeaveLine = 'Short leave: allowance '
        '${_jsNum(b.shortLeave.allowance)} · used '
        '${_jsNum(b.shortLeave.usedThisMonth)} · remaining '
        '${_jsNum(b.shortLeave.remaining)}'
        '${b.shortLeave.allowance == 0 ? ' · starts ${b.eligibleFrom}' : ''}';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Salary Calculation',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppTheme.foreground,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'How ${formatCurrency(b.baseSalary)} becomes '
            '${formatCurrency(b.finalAmount)}',
            style: const TextStyle(fontSize: 11, color: AppTheme.mutedForeground),
          ),
          const SizedBox(height: 16),

          _calcRow(
            label: 'Base salary (${b.daysInMonth.toInt()}-day month)',
            amount: formatCurrency(b.baseSalary),
          ),
          _calcRow(
            label: 'Daily wage = base ÷ ${b.daysInMonth.toInt()}',
            amount: formatCurrency(b.dailyWage),
          ),

          if (showEarnings) ...[
            const SizedBox(height: 10),
            const _SectionHeader('— Earnings —'),
            if (b.holidayWorkExtraDays > 0) ...[
              _calcRow(
                label:
                    'Holiday / Sunday work (${_dayCount(b.holidayWorkExtraDays)} d)',
                amount:
                    '+ ${formatCurrency(b.holidayWorkExtraDays * b.dailyWage)}',
                amountColor: _earningsColor,
              ),
              for (final entry in b.holidayWorkEntries)
                _mutedText(
                  '${formatDate(entry.date)} — ${entry.label} — '
                  '+${_dayCount(entry.credit)} day',
                ),
            ],
            if (b.extraExpenses > 0)
              _calcRow(
                label: 'Approved expenses',
                amount: '+ ${formatCurrency(b.extraExpenses)}',
                amountColor: _earningsColor,
              ),
          ],

          if (showDeductions) ...[
            const SizedBox(height: 10),
            const _SectionHeader('— Deductions —'),
            if (b.paidLeave.overageDays > 0) ...[
              _calcRow(
                label: 'Unpaid leave (${_dayCount(b.paidLeave.overageDays)} d)',
                amount:
                    '− ${formatCurrency(b.paidLeave.overageDays * b.dailyWage)}',
                amountColor: _deductionColor,
              ),
              _mutedText(
                '${_jsNum(b.paidLeave.usedThisMonth)} used − '
                '${_jsNum(b.paidLeave.available)} available',
              ),
              _mutedText(
                '${b.attendance.onLeave} on leave + ${b.attendance.absent} '
                'absent + ${b.attendance.halfDay} half × ½',
              ),
            ],
            if (b.shortLeave.overageDays > 0) ...[
              _calcRow(
                label:
                    'Short-leave overage (${_dayCount(b.shortLeave.overageDays)} d)',
                amount:
                    '− ${formatCurrency(b.shortLeave.overageDays * b.dailyWage)}',
                amountColor: _deductionColor,
              ),
              _mutedText(
                '${_jsNum(b.shortLeave.usedThisMonth)} short − '
                '${_jsNum(b.shortLeave.allowance)} free, ¼ day each',
              ),
            ],
          ],

          const SizedBox(height: 12),
          const Divider(color: AppTheme.border),
          const SizedBox(height: 6),
          _calcRow(
            label: 'Net payable',
            amount: formatCurrency(b.finalAmount),
            bold: true,
            large: true,
          ),

          const SizedBox(height: 16),
          const Divider(color: AppTheme.border),
          const SizedBox(height: 10),
          _mutedText(attendanceLine),
          const SizedBox(height: 4),
          _mutedText(paidLeaveLine),
          const SizedBox(height: 4),
          _mutedText(shortLeaveLine),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.title);

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          letterSpacing: 1.1,
          color: AppTheme.mutedForeground,
        ),
      ),
    );
  }
}

Widget _mutedText(String text) {
  return Padding(
    padding: const EdgeInsets.only(left: 4, top: 2, bottom: 2),
    child: Text(text, style: _mutedStyle),
  );
}

Widget _calcRow({
  required String label,
  required String amount,
  Color? amountColor,
  bool bold = false,
  bool large = false,
}) {
  return Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: large ? 14 : 13,
              fontWeight: bold || large ? FontWeight.w600 : FontWeight.w400,
              color: AppTheme.foreground,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Text(
          amount,
          style: TextStyle(
            fontSize: large ? 18 : 13,
            fontWeight: bold || large ? FontWeight.w700 : FontWeight.w600,
            color: amountColor ?? AppTheme.foreground,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
      ],
    ),
  );
}

String _jsNum(double value) {
  return value == value.roundToDouble()
      ? value.toInt().toString()
      : value.toString();
}

String _dayCount(double value) {
  return value == value.roundToDouble()
      ? value.toInt().toString()
      : value.toStringAsFixed(2);
}

// ---------------------------------------------------------------------------
// History section
// ---------------------------------------------------------------------------

class _HistorySection extends StatelessWidget {
  const _HistorySection({required this.records});

  final List<SalaryRecord> records;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          const Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Salary History',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.foreground,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Your past monthly salary records.',
                  style: TextStyle(
                    fontSize: 11,
                    color: AppTheme.mutedForeground,
                  ),
                ),
              ],
            ),
          ),

          if (records.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.receipt_long_rounded,
                      size: 28,
                      color: AppTheme.mutedForeground,
                    ),
                    SizedBox(height: 8),
                    Text(
                      'No salary history yet',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppTheme.foreground,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Salary records will appear here once they are published.',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            ...records.map(
              (record) => GestureDetector(
                onTap: () => _showDetail(context, record),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  decoration: const BoxDecoration(
                    border: Border(
                      top: BorderSide(color: AppTheme.border),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 3,
                        child: Text(
                          monthLabel(record.month, record.year),
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: AppTheme.foreground,
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: Text(
                          formatCurrency(record.amount),
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppTheme.foreground,
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: _StatusBadge(status: record.status),
                      ),
                      Expanded(
                        flex: 2,
                        child: Text(
                          record.paidDate != null
                              ? formatDate(record.paidDate!)
                              : '—',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppTheme.mutedForeground,
                          ),
                        ),
                      ),
                      const Icon(
                        Icons.chevron_right,
                        size: 16,
                        color: AppTheme.mutedForeground,
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  void _showDetail(BuildContext context, SalaryRecord record) {
    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              monthLabel(record.month, record.year),
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppTheme.foreground,
              ),
            ),
            const SizedBox(height: 16),
            _detailRow('Amount', formatCurrency(record.amount)),
            _detailRow('Status', record.status),
            _detailRow(
              'Paid Date',
              record.paidDate != null ? formatDate(record.paidDate!) : '—',
            ),
            if (record.isEstimate) _detailRow('Type', 'Estimate'),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: AppTheme.mutedForeground,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppTheme.foreground,
            ),
          ),
        ],
      ),
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
    final isPaid = status == 'PAID';
    final isEstimate = status == 'ESTIMATE';

    final color = isPaid
        ? const Color(0xFF10B981)
        : isEstimate
            ? const Color(0xFFF59E0B)
            : const Color(0xFFF59E0B);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 5,
            height: 5,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 4),
          Text(
            isEstimate ? 'Estimate' : status,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
