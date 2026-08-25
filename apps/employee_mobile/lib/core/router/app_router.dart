import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/data/auth_provider.dart';
import '../../features/attendance/presentation/attendance_screen.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/salary/presentation/salary_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/score/presentation/score_screen.dart';
import '../../features/extra_days/presentation/extra_days_screen.dart';
import '../../shared/widgets/app_shell.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final session = ref.watch(sessionProvider);

  return GoRouter(
    initialLocation: '/dashboard',
    redirect: (context, state) {
      final isLoggedIn = session.isAuthenticated;
      final isLoading = session.isLoading;
      final goingToLogin = state.matchedLocation == '/login';

      // Still loading session from storage — show nothing yet
      if (isLoading) return null;

      // Not logged in → force to login
      if (!isLoggedIn && !goingToLogin) return '/login';

      // Logged in but on login → redirect to dashboard
      if (isLoggedIn && goingToLogin) return '/dashboard';

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => AppShell(
          navigationShell: navigationShell,
        ),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/dashboard',
                builder: (context, state) => const DashboardScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/attendance',
                builder: (context, state) => const AttendanceScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/salary',
                builder: (context, state) => const SalaryScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/score',
        builder: (context, state) => const ScoreScreen(),
      ),
      GoRoute(
        path: '/extra-days',
        builder: (context, state) => const ExtraDaysScreen(),
      ),
    ],
  );
});
