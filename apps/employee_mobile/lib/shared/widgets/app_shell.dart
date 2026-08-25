import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';

class AppShell extends StatelessWidget {
  const AppShell({
    super.key,
    required this.navigationShell,
  });

  final StatefulNavigationShell navigationShell;

  static const _tabTitles = [
    'Dashboard',
    'My Attendance',
    'My Salary',
    'Your Profile',
  ];

  static const _tabs = [
    _NavTab(label: 'Dashboard', icon: Icons.dashboard_rounded),
    _NavTab(label: 'Attendance', icon: Icons.event_available_rounded),
    _NavTab(label: 'Salary', icon: Icons.account_balance_wallet_rounded),
    _NavTab(label: 'Profile', icon: Icons.person_rounded),
  ];

  @override
  Widget build(BuildContext context) {
    final index = navigationShell.currentIndex;

    return Scaffold(
      appBar: AppBar(title: Text(_tabTitles[index])),
      body: navigationShell,
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: _FloatingNav(
            tabs: _tabs,
            currentIndex: index,
            onTabTap: (i) => navigationShell.goBranch(
              i,
              initialLocation: i == navigationShell.currentIndex,
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Floating pill bottom navigation
// ---------------------------------------------------------------------------

class _FloatingNav extends StatelessWidget {
  const _FloatingNav({
    required this.tabs,
    required this.currentIndex,
    required this.onTabTap,
  });

  final List<_NavTab> tabs;
  final int currentIndex;
  final ValueChanged<int> onTabTap;

  @override
  Widget build(BuildContext context) {
    final count = tabs.length;

    return Container(
      height: 56,
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppTheme.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Sliding indicator pill (behind the tab row)
          AnimatedAlign(
            duration: const Duration(milliseconds: 260),
            curve: Curves.easeOutCubic,
            alignment: Alignment(
              -1 + (2 * currentIndex) / (count - 1),
              0,
            ),
            child: FractionallySizedBox(
              widthFactor: 1 / count,
              child: Container(
                height: 44,
                decoration: BoxDecoration(
                  color: AppTheme.primary,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
          ),

          // Tab icons/labels (on top, transparent background)
          Row(
            children: List.generate(count, (i) {
              final tab = tabs[i];
              final isActive = i == currentIndex;
              return Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => onTabTap(i),
                  child: SizedBox(
                    height: 44,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        TweenAnimationBuilder<Color?>(
                          duration: const Duration(milliseconds: 260),
                          curve: Curves.easeOutCubic,
                          tween: ColorTween(
                            end: isActive
                                ? AppTheme.primaryForeground
                                : AppTheme.mutedForeground,
                          ),
                          builder: (_, color, _) => Icon(
                            tab.icon,
                            size: 20,
                            color: color,
                          ),
                        ),
                        const SizedBox(height: 2),
                        TweenAnimationBuilder<Color?>(
                          duration: const Duration(milliseconds: 260),
                          curve: Curves.easeOutCubic,
                          tween: ColorTween(
                            end: isActive
                                ? AppTheme.primaryForeground
                                : AppTheme.mutedForeground,
                          ),
                          builder: (_, color, _) => Text(
                            tab.label,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: color,
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
        ],
      ),
    );
  }
}

class _NavTab {
  const _NavTab({
    required this.label,
    required this.icon,
  });

  final String label;
  final IconData icon;
}
