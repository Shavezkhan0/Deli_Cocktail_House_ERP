import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';

// ---------------------------------------------------------------------------
// Connectivity provider
// ---------------------------------------------------------------------------

final connectivityProvider = StreamNotifierProvider<ConnectivityNotifier, bool>(
  ConnectivityNotifier.new,
);

class ConnectivityNotifier extends StreamNotifier<bool> {
  @override
  Stream<bool> build() async* {
    final connectivity = Connectivity();
    final initial = await connectivity.checkConnectivity();
    yield initial.any((r) => r != ConnectivityResult.none);

    await for (final results in connectivity.onConnectivityChanged) {
      yield results.any((r) => r != ConnectivityResult.none);
    }
  }
}

// ---------------------------------------------------------------------------
// Offline banner (persistent, dismissible)
// ---------------------------------------------------------------------------

class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOnline = ref.watch(connectivityProvider);

    return Stack(
      children: [
        child,
        if (isOnline.valueOrNull == false)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Material(
              color: const Color(0xFFFBBF24),
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.wifi_off_rounded,
                        size: 16,
                        color: Color(0xFF78350F),
                      ),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'You are offline. Some features may be unavailable.',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF78350F),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Server unavailable overlay
// ---------------------------------------------------------------------------

class ServerUnavailableOverlay extends StatelessWidget {
  const ServerUnavailableOverlay({super.key, required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: AppTheme.destructive.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.cloud_off_rounded,
                  size: 36,
                  color: AppTheme.destructive,
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'Server Unavailable',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.foreground,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Unable to reach the server. Please check your internet connection and try again.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  height: 1.5,
                  color: AppTheme.mutedForeground.withValues(alpha: 0.8),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('Retry'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  foregroundColor: AppTheme.primaryForeground,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 14,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Connection error checker
// ---------------------------------------------------------------------------

bool isConnectionError(Object error) {
  final str = error.toString().toLowerCase();
  return str.contains('connection') ||
      str.contains('socket') ||
      str.contains('network') ||
      str.contains('timeout') ||
      str.contains('no internet');
}
