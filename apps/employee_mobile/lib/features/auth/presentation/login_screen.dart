import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/app_toast.dart';
import '../data/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _otpController = TextEditingController();
  final _emailFormKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _emailController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  void _handleRequestOtp() {
    if (!_emailFormKey.currentState!.validate()) return;
    final email = _emailController.text.trim();
    ref.read(authFlowProvider.notifier).requestOtp(email);
  }

  Future<void> _handleVerifyOtp() async {
    final otp = _otpController.text.trim();
    if (otp.length != 6) {
      showTopToast(context, 'Please enter the 6-digit OTP', isError: true);
      return;
    }

    final success = await ref.read(authFlowProvider.notifier).verifyOtp(otp);
    if (success && mounted) {
      // Router will auto-redirect via the session provider
    }
  }

  void _handleUseDifferentEmail() {
    _otpController.clear();
    ref.read(authFlowProvider.notifier).goBackToEmail();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authFlowProvider);

    ref.listen<AuthFlowState>(authFlowProvider, (previous, next) {
      final justSentOtp = next.status == AuthFlowStatus.otpSent &&
          previous?.status != AuthFlowStatus.otpSent;
      final justFailed = next.status == AuthFlowStatus.error &&
          next.errorMessage != null &&
          next.errorMessage != previous?.errorMessage;

      if (justSentOtp) {
        showTopToast(context, 'OTP sent to ${next.email}');
      } else if (justFailed) {
        showTopToast(context, next.errorMessage!, isError: true);
      }
    });

    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Logo placeholder
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppTheme.primary,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.local_bar,
                        color: AppTheme.primaryForeground,
                        size: 24,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Welcome back',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      authState.status == AuthFlowStatus.otpSent ||
                              authState.status == AuthFlowStatus.verifying
                          ? 'Enter the 6-digit code sent to ${authState.email}'
                          : 'Sign in to the Deli Cocktail House employee portal.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: AppTheme.mutedForeground,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 24),

                    if (authState.status == AuthFlowStatus.otpSent ||
                        authState.status == AuthFlowStatus.verifying)
                      _OtpStep(
                        controller: _otpController,
                        isLoading: authState.status == AuthFlowStatus.verifying,
                        onVerify: _handleVerifyOtp,
                        onUseDifferentEmail: _handleUseDifferentEmail,
                        errorMessage: authState.errorMessage,
                      )
                    else
                      _EmailStep(
                        formKey: _emailFormKey,
                        controller: _emailController,
                        isLoading:
                            authState.status == AuthFlowStatus.requesting,
                        onSubmit: _handleRequestOtp,
                        errorMessage: authState.errorMessage,
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Email step
// ---------------------------------------------------------------------------

class _EmailStep extends StatelessWidget {
  const _EmailStep({
    required this.formKey,
    required this.controller,
    required this.isLoading,
    required this.onSubmit,
    this.errorMessage,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController controller;
  final bool isLoading;
  final VoidCallback onSubmit;
  final String? errorMessage;

  @override
  Widget build(BuildContext context) {
    return Form(
      key: formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Email',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: AppTheme.foreground,
            ),
          ),
          const SizedBox(height: 6),
          TextFormField(
            controller: controller,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.done,
            autofocus: true,
            decoration: const InputDecoration(
              hintText: 'you@example.com',
            ),
            validator: (value) {
              if (value == null || value.trim().isEmpty) {
                return 'Email is required';
              }
              final trimmed = value.trim();
              if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(trimmed)) {
                return 'Please enter a valid email address';
              }
              return null;
            },
            onFieldSubmitted: (_) => onSubmit(),
          ),
          if (errorMessage != null) ...[
            const SizedBox(height: 8),
            Text(
              errorMessage!,
              style: const TextStyle(color: AppTheme.destructive, fontSize: 12),
            ),
          ],
          const SizedBox(height: 16),
          SizedBox(
            height: 44,
            child: ElevatedButton(
              onPressed: isLoading ? null : onSubmit,
              child: isLoading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppTheme.primaryForeground,
                      ),
                    )
                  : const Text('Send OTP'),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// OTP step
// ---------------------------------------------------------------------------

class _OtpStep extends StatelessWidget {
  const _OtpStep({
    required this.controller,
    required this.isLoading,
    required this.onVerify,
    required this.onUseDifferentEmail,
    this.errorMessage,
  });

  final TextEditingController controller;
  final bool isLoading;
  final VoidCallback onVerify;
  final VoidCallback onUseDifferentEmail;
  final String? errorMessage;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'One-time password',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: AppTheme.foreground,
          ),
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          keyboardType: TextInputType.number,
          textInputAction: TextInputAction.done,
          maxLength: 6,
          autofocus: true,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            letterSpacing: 12,
          ),
          decoration: const InputDecoration(
            hintText: '••••••',
            counterText: '',
          ),
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
          ],
          onFieldSubmitted: (_) => onVerify(),
        ),
        if (errorMessage != null) ...[
          const SizedBox(height: 8),
          Text(
            errorMessage!,
            style: const TextStyle(color: AppTheme.destructive, fontSize: 12),
          ),
        ],
        const SizedBox(height: 16),
        SizedBox(
          height: 44,
          child: ElevatedButton(
            onPressed: isLoading ? null : onVerify,
            child: isLoading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppTheme.primaryForeground,
                    ),
                  )
                : const Text('Verify & Login'),
          ),
        ),
        const SizedBox(height: 12),
        Center(
          child: TextButton(
            onPressed: isLoading ? null : onUseDifferentEmail,
            child: const Text(
              'Use a different email',
              style: TextStyle(
                color: AppTheme.mutedForeground,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
