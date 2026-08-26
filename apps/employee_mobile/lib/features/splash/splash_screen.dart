import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../../core/theme/app_theme.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Black-and-gold emblem badge — the gold ring/lettering is a
            // transparent-background asset, composited here onto its own
            // black circular backing (not the whole screen) plus a soft
            // dark shadow and a faint warm gold glow for a premium feel.
            Container(
              width: 176,
              height: 176,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF0A0A0A),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.35),
                    blurRadius: 36,
                    offset: const Offset(0, 14),
                  ),
                  BoxShadow(
                    color: const Color(0xFFD4AF37).withValues(alpha: 0.18),
                    blurRadius: 56,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Image.asset(
                'assets/icon/app_icon_foreground.png',
                fit: BoxFit.contain,
              ),
            )
                .animate()
                .fadeIn(duration: 500.ms, curve: Curves.easeOut)
                .scale(
                  begin: const Offset(0.8, 0.8),
                  end: const Offset(1, 1),
                  duration: 500.ms,
                  curve: Curves.easeOutBack,
                ),
            const SizedBox(height: 22),
            const Text(
              'EMPLOYEE',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppTheme.mutedForeground,
                letterSpacing: 4,
              ),
            )
                .animate(delay: 350.ms)
                .fadeIn(duration: 400.ms, curve: Curves.easeOut)
                .slideY(
                  begin: 0.3,
                  end: 0,
                  duration: 400.ms,
                  curve: Curves.easeOut,
                ),
          ],
        ),
      ),
    );
  }
}
