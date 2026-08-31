import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';

import '../../auth/data/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../shared/widgets/skeleton.dart';
import '../../../shared/widgets/state_widgets.dart';
import '../../../shared/widgets/connectivity_widgets.dart';
import '../data/extra_days_repository.dart';

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

final extraDaysRepositoryProvider = Provider<ExtraDaysRepository>((ref) {
  return ExtraDaysRepository(ref.watch(apiClientProvider).dio);
});

final extraDaysProvider = FutureProvider<ExtraDaysRecord>((ref) async {
  return ref.watch(extraDaysRepositoryProvider).getExtraDays();
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const _sourceLabels = <String, String>{
  'SUNDAY': 'Worked Sunday',
  'HOLIDAY': 'Worked Holiday',
  'FORCE_WORK': 'Assigned Workday',
};

const _statusLabels = <String, String>{
  'PRESENT': 'Present',
  'HALF_DAY': 'Half Day',
  'SHORT_LEAVE': 'Short Leave',
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

class ExtraDaysScreen extends ConsumerWidget {
  const ExtraDaysScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final extraDaysAsync = ref.watch(extraDaysProvider);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, size: 20),
          onPressed: () => context.go('/profile'),
        ),
        title: const Text(
          'Extra Days',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
        backgroundColor: AppTheme.background,
        foregroundColor: AppTheme.foreground,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
      ),
      backgroundColor: AppTheme.background,
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(extraDaysProvider);
          await ref.read(extraDaysProvider.future);
        },
        child: extraDaysAsync.when(
          loading: () => const _ExtraDaysSkeleton(),
          error: (e, _) => isConnectionError(e)
              ? ServerUnavailableOverlay(onRetry: () => ref.invalidate(extraDaysProvider))
              : ErrorState(message: 'Could not load your extra days.', onRetry: () => ref.invalidate(extraDaysProvider)),
          data: (data) => _ExtraDaysBody(data: data),
        ),
      ),
    );
  }
}

class _ExtraDaysBody extends StatelessWidget {
  const _ExtraDaysBody({required this.data});

  final ExtraDaysRecord data;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Summary badge
        _SummaryBadges(extraPayDays: data.holidayWorkExtraDays),
        const SizedBox(height: 16),

        // Extra pay note
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppTheme.border),
          ),
          child: const Text(
            'Working on a Sunday, holiday or assigned workday earns you extra pay on top of your base salary.',
            style: TextStyle(
              fontSize: 11,
              height: 1.5,
              color: AppTheme.mutedForeground,
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Entries section
        if (data.entries.isNotEmpty)
          _EntriesSection(entries: data.entries)
        else
          _EmptyState(),
        const SizedBox(height: 32),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Extra days page skeleton
// ---------------------------------------------------------------------------

class _ExtraDaysSkeleton extends StatelessWidget {
  const _ExtraDaysSkeleton();

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
          // --- Summary badge skeleton ---
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.border),
            ),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  SkeletonBox(width: 7, height: 7, borderRadius: 999),
                  SizedBox(width: 8),
                  SkeletonBox(width: 110, height: 11, borderRadius: 4),
                  Spacer(),
                  SkeletonBox(width: 24, height: 14, borderRadius: 4),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // --- Entries section skeleton ---
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
                      SkeletonBox(width: 160, height: 14, borderRadius: 4),
                      SizedBox(height: 6),
                      SkeletonBox(width: 260, height: 11, borderRadius: 4),
                    ],
                  ),
                ),
                // 5 entry rows matching _EntryTile layout
                ...List.generate(5, (_) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: const BoxDecoration(
                      border: Border(top: BorderSide(color: AppTheme.border)),
                    ),
                    child: Row(
                      children: [
                        // Date column (flex 3)
                        const Expanded(
                          flex: 3,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SkeletonBox(height: 13, borderRadius: 4),
                              SizedBox(height: 6),
                              SkeletonBox(width: 80, height: 11, borderRadius: 4),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Attendance (flex 2)
                        const Expanded(
                          flex: 2,
                          child: SkeletonBox(height: 12, borderRadius: 4),
                        ),
                        const SizedBox(width: 12),
                        // Credit (flex 1)
                        const Expanded(
                          flex: 1,
                          child: SkeletonBox(height: 12, borderRadius: 4),
                        ),
                        const SizedBox(width: 12),
                        // Banked badge
                        SkeletonBox(width: 64, height: 22, borderRadius: 11),
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
// Summary badges
// ---------------------------------------------------------------------------

class _SummaryBadges extends StatelessWidget {
  const _SummaryBadges({
    required this.extraPayDays,
  });

  final double extraPayDays;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.border),
      ),
      child: _Badge(
        label: 'Extra Pay Days',
        value: extraPayDays == extraPayDays.roundToDouble()
            ? extraPayDays.toInt().toString()
            : extraPayDays.toStringAsFixed(1),
        dotColor: const Color(0xFF8B5CF6),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({
    required this.label,
    required this.value,
    required this.dotColor,
  });

  final String label;
  final String value;
  final Color dotColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle),
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: AppTheme.mutedForeground,
            ),
          ),
          const Spacer(),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: dotColor,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Entries section
// ---------------------------------------------------------------------------

class _EntriesSection extends StatelessWidget {
  const _EntriesSection({required this.entries});

  final List<ExtraDaysEntry> entries;

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
          const Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Extra Working Days',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.foreground,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Days you earned extra pay for working on Sundays, holidays, or assigned workdays.',
                  style: TextStyle(
                    fontSize: 11,
                    color: AppTheme.mutedForeground,
                  ),
                ),
              ],
            ),
          ),
          ...entries.map((entry) => _EntryTile(entry: entry)),
        ],
      ),
    );
  }
}

class _EntryTile extends StatelessWidget {
  const _EntryTile({required this.entry});

  final ExtraDaysEntry entry;

  @override
  Widget build(BuildContext context) {
    final sourceLabel = _sourceLabels[entry.source] ?? entry.source;
    final statusLabel = _statusLabels[entry.status] ?? entry.status;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: AppTheme.border)),
      ),
      child: Row(
        children: [
          // Date column
          Expanded(
            flex: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _formatEntryDate(entry.date),
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: AppTheme.foreground,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  sourceLabel,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppTheme.mutedForeground,
                  ),
                ),
              ],
            ),
          ),

          // Attendance
          Expanded(
            flex: 2,
            child: Text(
              statusLabel,
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.mutedForeground,
              ),
            ),
          ),

          // Credit
          Expanded(
            flex: 1,
            child: Text(
              entry.status == 'PRESENT'
                  ? '${entry.credit.toInt()} day'
                  : '${entry.credit} day',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: AppTheme.foreground,
              ),
            ),
          ),

          // Banked status
          _BankedBadge(banked: entry.banked),
        ],
      ),
    );
  }

  String _formatEntryDate(String isoString) {
    final date = DateTime.parse(isoString);
    return formatDate(date.toIso8601String());
  }
}

class _BankedBadge extends StatelessWidget {
  const _BankedBadge({required this.banked});

  final bool banked;

  @override
  Widget build(BuildContext context) {
    final color = banked ? const Color(0xFF10B981) : const Color(0xFFF59E0B);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Container(
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
                banked ? 'Banked' : 'Pending',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
        ),
        if (!banked) ...[
          const SizedBox(height: 4),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.info_outline,
                size: 10,
                color: AppTheme.mutedForeground.withValues(alpha: 0.7),
              ),
              const SizedBox(width: 2),
              Text(
                'counts next month',
                style: TextStyle(
                  fontSize: 9,
                  color: AppTheme.mutedForeground.withValues(alpha: 0.7),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

class _EmptyState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(40),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.border),
      ),
      child: Center(
        child: Column(
          children: [
            Icon(
              Icons.event_available_rounded,
              size: 32,
              color: AppTheme.mutedForeground.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 12),
            const Text(
              'No extra days yet',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppTheme.foreground,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Extra pay is earned when you work on\nSundays, holidays, or assigned workdays.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                height: 1.5,
                color: AppTheme.mutedForeground.withValues(alpha: 0.8),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
