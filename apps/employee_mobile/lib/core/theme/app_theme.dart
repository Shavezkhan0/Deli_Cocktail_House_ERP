import 'package:flutter/material.dart';

class AppTheme {
  AppTheme._();

  static const _radius = 10.0;

  static const Color background = Color(0xFFFFFFFF);
  static const Color foreground = Color(0xFF0A0A0A);
  static const Color card = Color(0xFFFFFFFF);
  static const Color primary = Color(0xFF171717);
  static const Color primaryForeground = Color(0xFFFAFAFA);
  static const Color surface = Color(0xFFF5F5F5);
  static const Color mutedForeground = Color(0xFF737373);
  static const Color border = Color(0xFFE5E5E5);
  static const Color input = Color(0xFFE5E5E5);
  static const Color focusRing = Color(0xFFA3A3A3);
  static const Color destructive = Color(0xFFDC2626);

  static ThemeData get light {
    final colorScheme = ColorScheme(
      brightness: Brightness.light,
      primary: primary,
      onPrimary: primaryForeground,
      secondary: surface,
      onSecondary: foreground,
      error: destructive,
      onError: primaryForeground,
      surface: background,
      onSurface: foreground,
      outline: border,
    );

    final inputDecorationTheme = InputDecorationTheme(
      filled: true,
      fillColor: background,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(_radius),
        borderSide: const BorderSide(color: input),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(_radius),
        borderSide: const BorderSide(color: input),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(_radius),
        borderSide: const BorderSide(color: focusRing, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(_radius),
        borderSide: const BorderSide(color: destructive),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(_radius),
        borderSide: const BorderSide(color: destructive, width: 2),
      ),
      hintStyle: const TextStyle(color: mutedForeground),
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: background,
      appBarTheme: const AppBarTheme(
        backgroundColor: background,
        foregroundColor: foreground,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: foreground,
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
      ),
      cardTheme: CardThemeData(
        color: card,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_radius),
          side: const BorderSide(color: border),
        ),
        margin: EdgeInsets.zero,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: primaryForeground,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(_radius),
          ),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: foreground,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(_radius),
          ),
          side: const BorderSide(color: border),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      inputDecorationTheme: inputDecorationTheme,
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: background,
        selectedItemColor: primary,
        unselectedItemColor: mutedForeground,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
        selectedLabelStyle: TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
        unselectedLabelStyle: TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
      ),
      dividerTheme: const DividerThemeData(
        color: border,
        thickness: 1,
        space: 0,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: foreground,
        contentTextStyle: const TextStyle(color: primaryForeground, fontSize: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(_radius)),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
