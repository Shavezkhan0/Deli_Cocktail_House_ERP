import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/data/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../shared/widgets/state_widgets.dart';
import '../../../shared/widgets/connectivity_widgets.dart';
import '../data/salary_repository.dart';

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

final salaryRepositoryProvider = Provider<SalaryRepository>((ref) {
  return SalaryRepository(ref.watch(apiClientProvider).dio);
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
        loading: () => const LoadingState(),
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

class _SalaryBody extends StatelessWidget {
  const _SalaryBody({required this.data});

  final SalaryData data;

  @override
  Widget build(BuildContext context) {
    // Merge previous into history if not already present (matches web app)
    final allHistory = [...data.history];
    if (data.previous != null &&
        !allHistory.any((r) => r.id == data.previous!.id)) {
      allHistory.insert(0, data.previous!);
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Current month card
        _CurrentMonthCard(record: data.current),
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
                label: 'Available',
                value: balance.availableLeaveBalance,
                color: const Color(0xFF10B981),
              ),
              const SizedBox(width: 12),
              _LeaveStat(
                label: 'Earned',
                value: balance.earnedLeaves,
                color: const Color(0xFF6366F1),
              ),
              const SizedBox(width: 12),
              _LeaveStat(
                label: 'Used',
                value: balance.usedLeaves,
                color: const Color(0xFFF59E0B),
              ),
              const SizedBox(width: 12),
              _LeaveStat(
                label: 'Comp',
                value: balance.compensatoryLeaves,
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
    required this.value,
    required this.color,
  });

  final String label;
  final double value;
  final Color color;

  @override
  Widget build(BuildContext context) {
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
              value == value.roundToDouble()
                  ? value.toInt().toString()
                  : value.toStringAsFixed(1),
              style: TextStyle(
                fontSize: 18,
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
