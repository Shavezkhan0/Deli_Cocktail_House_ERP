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
import '../../features/splash/splash_screen.dart';
import '../../shared/widgets/app_shell.dart';
import '../update/mandatory_update_screen.dart';
import '../update/update_launcher.dart';
import '../update/update_provider.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final session = ref.watch(sessionProvider);
  final update = ref.watch(updateProvider);

  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final isLoggedIn = session.isAuthenticated;
      final isLoading = session.isLoading;
      final goingToLogin = state.matchedLocation == '/login';
      final goingToUpdate = state.matchedLocation == '/mandatory-update';
      final goingToSplash = state.matchedLocation == '/splash';

      // Still loading session from storage — stay on splash
      if (isLoading) {
        return goingToSplash ? null : '/splash';
      }

      // Done loading but still on splash — redirect to appropriate screen
      if (goingToSplash) {
        return isLoggedIn ? '/dashboard' : '/login';
      }

      // Mandatory update blocks everything
      if (update.status == UpdateStatus.mandatory && !goingToUpdate) {
        return '/mandatory-update';
      }
      if (update.status == UpdateStatus.mandatory && goingToUpdate) {
        return null;
      }

      // Not logged in → force to login
      if (!isLoggedIn && !goingToLogin) return '/login';

      // Logged in but on login → redirect to dashboard
      if (isLoggedIn && goingToLogin) return '/dashboard';

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/mandatory-update',
        builder: (context, state) {
          final info = ref.read(updateProvider).versionInfo;
          return MandatoryUpdateScreen(
            onUpdate: () {
              if (info != null) {
                launchUpdate(context, info, ref.read(apiClientProvider).dio);
              }
            },
          );
        },
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
