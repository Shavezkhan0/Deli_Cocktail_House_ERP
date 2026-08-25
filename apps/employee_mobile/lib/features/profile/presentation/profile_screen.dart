import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/designations.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../auth/data/auth_provider.dart';
import '../data/profile_repository.dart';

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  return ProfileRepository(ref.watch(apiClientProvider).dio);
});

final profileProvider = FutureProvider<EmployeeProfile>((ref) async {
  return ref.watch(profileRepositoryProvider).getProfile();
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(profileProvider);

    return profileAsync.when(
      loading: () => const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: CircularProgressIndicator(),
        ),
      ),
      error: (e, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.error_outline,
                size: 32,
                color: AppTheme.destructive,
              ),
              const SizedBox(height: 8),
              const Text(
                'Could not load your profile',
                style: TextStyle(fontSize: 14, color: AppTheme.foreground),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => ref.invalidate(profileProvider),
                child: const Text('Try again'),
              ),
            ],
          ),
        ),
      ),
      data: (profile) => _ProfileBody(profile: profile),
    );
  }
}

class _ProfileBody extends ConsumerWidget {
  const _ProfileBody({required this.profile});

  final EmployeeProfile profile;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final employeeId = session.employee?.employeeId ?? '';

    final initials = profile.name
        .trim()
        .split(RegExp(r'\s+'))
        .map((p) => p.isNotEmpty ? p[0] : '')
        .take(2)
        .join()
        .toUpperCase();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Header: avatar + name + designation
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppTheme.card,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppTheme.border),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 32,
                backgroundColor: AppTheme.primary,
                child: Text(
                  initials.isNotEmpty ? initials : 'U',
                  style: const TextStyle(
                    color: AppTheme.primaryForeground,
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      profile.name,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.foreground,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        humanizeDesignation(profile.designation),
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.mutedForeground,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Employee ID (from session)
        if (employeeId.isNotEmpty) ...[
          _DetailRow(
            icon: Icons.badge_rounded,
            label: 'Employee ID',
            value: employeeId,
            accentColor: const Color(0xFF6366F1),
            accentBg: const Color(0xFFEEF2FF),
          ),
          const SizedBox(height: 12),
        ],

        // Detail rows
        Container(
          decoration: BoxDecoration(
            color: AppTheme.card,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppTheme.border),
          ),
          child: Column(
            children: [
              _DetailRow(
                icon: Icons.mail_rounded,
                label: 'Email',
                value: profile.email ?? '—',
                accentColor: const Color(0xFF0EA5E9),
                accentBg: const Color(0xFFE0F2FE),
              ),
              _DetailRow(
                icon: Icons.phone_rounded,
                label: 'Contact',
                value: profile.contact ?? '—',
                accentColor: const Color(0xFF10B981),
                accentBg: const Color(0xFFD1FAE5),
              ),
              _DetailRow(
                icon: Icons.calendar_today_rounded,
                label: 'Joining Date',
                value: formatDate(profile.joiningDate),
                accentColor: const Color(0xFF8B5CF6),
                accentBg: const Color(0xFFEDE9FE),
                isLast: true,
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Quick-access tiles: Weekly Score + Extra Days
        Container(
          decoration: BoxDecoration(
            color: AppTheme.card,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppTheme.border),
          ),
          child: Column(
            children: [
              _NavTile(
                icon: Icons.star_rounded,
                label: 'Weekly Score',
                subtitle: 'Your performance scores',
                accentColor: const Color(0xFFF59E0B),
                accentBg: const Color(0xFFFEF3C7),
                onTap: () => context.push('/score'),
              ),
              _NavTile(
                icon: Icons.event_available_rounded,
                label: 'Extra Days',
                subtitle: 'Sundays & holidays you worked',
                accentColor: const Color(0xFF10B981),
                accentBg: const Color(0xFFD1FAE5),
                onTap: () => context.push('/extra-days'),
                isLast: true,
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Logout button
        SizedBox(
          width: double.infinity,
          height: 44,
          child: OutlinedButton(
            onPressed: () {
              showDialog<void>(
                context: context,
                builder: (ctx) => AlertDialog(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  title: const Text('Logout'),
                  content: const Text('Are you sure you want to log out?'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.of(ctx).pop(),
                      child: const Text('Cancel'),
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.of(ctx).pop();
                        ref.read(sessionProvider.notifier).clear();
                        context.go('/login');
                      },
                      child: const Text(
                        'Logout',
                        style: TextStyle(color: AppTheme.destructive),
                      ),
                    ),
                  ],
                ),
              );
            },
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppTheme.destructive),
              foregroundColor: AppTheme.destructive,
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.logout, size: 18),
                SizedBox(width: 8),
                Text('Log out'),
              ],
            ),
          ),
        ),
        const SizedBox(height: 32),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Detail row widget
// ---------------------------------------------------------------------------

class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.accentColor,
    required this.accentBg,
    this.isLast = false,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color accentColor;
  final Color accentBg;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: isLast
          ? null
          : const BoxDecoration(
              border: Border(bottom: BorderSide(color: AppTheme.border)),
            ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: accentBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: accentColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.mutedForeground,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: AppTheme.foreground,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Navigation tile widget
// ---------------------------------------------------------------------------

class _NavTile extends StatelessWidget {
  const _NavTile({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.accentColor,
    required this.accentBg,
    required this.onTap,
    this.isLast = false,
  });

  final IconData icon;
  final String label;
  final String subtitle;
  final Color accentColor;
  final Color accentBg;
  final VoidCallback onTap;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.vertical(
          top: isLast ? Radius.zero : const Radius.circular(10),
        ),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: isLast
              ? null
              : const BoxDecoration(
                  border: Border(bottom: BorderSide(color: AppTheme.border)),
                ),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: accentBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: accentColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppTheme.foreground,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 11,
                        color: AppTheme.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.chevron_right_rounded,
                size: 20,
                color: AppTheme.mutedForeground,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
