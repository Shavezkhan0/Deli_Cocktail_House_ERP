import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../auth/data/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../data/score_repository.dart';
import '../../../shared/widgets/state_widgets.dart';
import '../../../shared/widgets/connectivity_widgets.dart';

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

final scoreRepositoryProvider = Provider<ScoreRepository>((ref) {
  return ScoreRepository(ref.watch(apiClientProvider).dio);
});

final scoreProvider = FutureProvider<ScoreData>((ref) async {
  final repo = ref.watch(scoreRepositoryProvider);
  final results = await Future.wait([
    repo.getCurrent(),
    repo.getHistory(),
  ]);
  return ScoreData(
    current: results[0] as WeeklyScore?,
    history: results[1] as List<WeeklyScore>,
  );
});

class ScoreData {
  ScoreData({required this.current, required this.history});

  final WeeklyScore? current;
  final List<WeeklyScore> history;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

class ScoreScreen extends ConsumerWidget {
  const ScoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scoreAsync = ref.watch(scoreProvider);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, size: 20),
          onPressed: () => context.go('/profile'),
        ),
        title: const Text(
          'My Score',
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
          ref.invalidate(scoreProvider);
          await ref.read(scoreProvider.future);
        },
        child: scoreAsync.when(
          loading: () => const LoadingState(),
          error: (e, _) => isConnectionError(e)
              ? ServerUnavailableOverlay(
                  onRetry: () => ref.invalidate(scoreProvider))
              : ErrorState(
                  message: 'Could not load your score.',
                  onRetry: () => ref.invalidate(scoreProvider)),
          data: (data) => _ScoreBody(data: data),
        ),
      ),
    );
  }
}

class _ScoreBody extends StatelessWidget {
  const _ScoreBody({required this.data});

  final ScoreData data;

  @override
  Widget build(BuildContext context) {
    return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Current week card
          _CurrentWeekCard(score: data.current),
          const SizedBox(height: 16),

          // History chart card
          _HistoryCard(history: data.history),
          const SizedBox(height: 16),

          // Manager notes card
          _NotesCard(score: data.current),
          const SizedBox(height: 32),
        ],
      );
  }
}

// ---------------------------------------------------------------------------
// Current week card
// ---------------------------------------------------------------------------

class _CurrentWeekCard extends StatelessWidget {
  const _CurrentWeekCard({required this.score});

  final WeeklyScore? score;

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
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.star_rounded,
                  size: 18,
                  color: Color(0xFFF59E0B),
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'This Week',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.foreground,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Score for the current week',
                    style: TextStyle(
                      fontSize: 11,
                      color: AppTheme.mutedForeground.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),
          if (score != null)
            Center(child: _ScoreRing(score: score!.score))
          else
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Column(
                  children: [
                    Icon(
                      Icons.hourglass_empty_rounded,
                      size: 32,
                      color: AppTheme.mutedForeground.withValues(alpha: 0.5),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'No score yet for this week',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppTheme.foreground,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Your manager hasn\'t published a score yet.',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppTheme.mutedForeground.withValues(alpha: 0.8),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Score ring (custom painted)
// ---------------------------------------------------------------------------

class _ScoreRing extends StatelessWidget {
  const _ScoreRing({required this.score});

  final int score;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 168,
      height: 168,
      child: CustomPaint(
        painter: _RingPainter(score: score),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '$score',
                style: const TextStyle(
                  fontSize: 40,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.foreground,
                  height: 1,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '/ 10',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.mutedForeground.withValues(alpha: 0.6),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'THIS WEEK',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.2,
                  color: AppTheme.mutedForeground.withValues(alpha: 0.5),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({required this.score});

  final int score;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - 14) / 2;

    // Background ring
    final bgPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 14
      ..color = AppTheme.border;
    canvas.drawCircle(center, radius, bgPaint);

    // Gradient arc
    final rect = Rect.fromCircle(center: center, radius: radius);
    const gradient = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [Color(0xFF6366F1), Color(0xFFA855F7)],
    );
    final arcPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 14
      ..strokeCap = StrokeCap.round
      ..shader = gradient.createShader(rect);

    final sweepAngle = 2 * math.pi * (score / 10);
    canvas.drawArc(rect, -math.pi / 2, sweepAngle, false, arcPaint);
  }

  @override
  bool shouldRepaint(_RingPainter oldDelegate) =>
      oldDelegate.score != score;
}

// ---------------------------------------------------------------------------
// History chart card
// ---------------------------------------------------------------------------

class _HistoryCard extends StatelessWidget {
  const _HistoryCard({required this.history});

  final List<WeeklyScore> history;

  @override
  Widget build(BuildContext context) {
    // Order oldest → newest for chart (left to right)
    final ordered = [...history].reversed.toList();

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
                  color: const Color(0xFF6366F1).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.bar_chart_rounded,
                  size: 18,
                  color: Color(0xFF6366F1),
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Score History',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.foreground,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Last ${history.length} week${history.length == 1 ? '' : 's'}',
                    style: TextStyle(
                      fontSize: 11,
                      color: AppTheme.mutedForeground.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          if (ordered.isNotEmpty)
            _ScoreChart(ordered: ordered)
          else
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.bar_chart,
                      size: 28,
                      color: AppTheme.mutedForeground.withValues(alpha: 0.5),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'No scores recorded yet',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppTheme.foreground,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Weekly scores will appear here as they are published.',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppTheme.mutedForeground.withValues(alpha: 0.8),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ScoreChart extends StatelessWidget {
  const _ScoreChart({required this.ordered});

  final List<WeeklyScore> ordered;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 160,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: ordered.map((entry) {
          final barHeight = (entry.score / 10) * 120;
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text(
                    '${entry.score}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF8B5CF6),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    height: math.max(barHeight, 12),
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                        colors: [Color(0xFF6366F1), Color(0xFFA855F7)],
                      ),
                      borderRadius: BorderRadius.vertical(
                        top: Radius.circular(6),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _weekLabel(entry.weekStart),
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                      color: AppTheme.mutedForeground.withValues(alpha: 0.7),
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  String _weekLabel(String isoString) {
    final date = DateTime.parse(isoString);
    final day = date.day;
    final month = _monthShort(date.month);
    return '$day $month';
  }

  String _monthShort(int month) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return months[month - 1];
  }
}

// ---------------------------------------------------------------------------
// Manager notes card
// ---------------------------------------------------------------------------

class _NotesCard extends StatelessWidget {
  const _NotesCard({required this.score});

  final WeeklyScore? score;

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
                  Icons.notes_rounded,
                  size: 18,
                  color: Color(0xFF0EA5E9),
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Manager Notes',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.foreground,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Feedback for this week',
                    style: TextStyle(
                      fontSize: 11,
                      color: AppTheme.mutedForeground.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.surface,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              score?.notes ?? 'No notes for this week.',
              style: TextStyle(
                fontSize: 13,
                height: 1.5,
                color: score?.notes != null
                    ? AppTheme.foreground
                    : AppTheme.mutedForeground.withValues(alpha: 0.7),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
