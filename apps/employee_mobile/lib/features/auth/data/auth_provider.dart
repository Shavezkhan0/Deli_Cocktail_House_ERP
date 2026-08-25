import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage.dart';
import 'auth_repository.dart';

// ---------------------------------------------------------------------------
// Storage + repository singletons
// ---------------------------------------------------------------------------

final secureStorageProvider = Provider<SecureStorage>((ref) {
  return SecureStorage();
});

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient();
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    ref.watch(apiClientProvider).dio,
    ref.watch(secureStorageProvider),
  );
});

// ---------------------------------------------------------------------------
// Employee model
// ---------------------------------------------------------------------------

class EmployeeUser {
  EmployeeUser({
    required this.id,
    required this.employeeId,
    required this.name,
    required this.designation,
    required this.email,
  });

  factory EmployeeUser.fromJson(Map<String, dynamic> json) {
    return EmployeeUser(
      id: json['id'] as String,
      employeeId: (json['employeeId'] as String?) ?? '',
      name: json['name'] as String,
      designation: json['designation'] as String,
      email: json['email'] as String,
    );
  }

  final String id;
  final String employeeId;
  final String name;
  final String designation;
  final String email;

  Map<String, dynamic> toJson() => {
        'id': id,
        'employeeId': employeeId,
        'name': name,
        'designation': designation,
        'email': email,
      };
}

// ---------------------------------------------------------------------------
// Login flow state machine
// ---------------------------------------------------------------------------

enum AuthFlowStatus { idle, requesting, otpSent, verifying, success, error }

class AuthFlowState {
  const AuthFlowState({
    this.status = AuthFlowStatus.idle,
    this.email = '',
    this.errorMessage,
  });

  final AuthFlowStatus status;
  final String email;
  final String? errorMessage;

  AuthFlowState copyWith({
    AuthFlowStatus? status,
    String? email,
    String? errorMessage,
  }) {
    return AuthFlowState(
      status: status ?? this.status,
      email: email ?? this.email,
      errorMessage: errorMessage,
    );
  }
}

class AuthFlowNotifier extends Notifier<AuthFlowState> {
  @override
  AuthFlowState build() => const AuthFlowState();

  Future<void> requestOtp(String email) async {
    state = state.copyWith(
      status: AuthFlowStatus.requesting,
      email: email,
      errorMessage: null,
    );

    try {
      await ref.read(authRepositoryProvider).requestOtp(email);
      state = state.copyWith(status: AuthFlowStatus.otpSent, email: email);
    } catch (e) {
      state = state.copyWith(
        status: AuthFlowStatus.error,
        errorMessage: e.toString(),
      );
    }
  }

  Future<bool> verifyOtp(String otp) async {
    state = state.copyWith(status: AuthFlowStatus.verifying, errorMessage: null);

    try {
      final result = await ref
          .read(authRepositoryProvider)
          .verifyOtp(state.email, otp);
      ref.read(sessionProvider.notifier)._setSession(
            result.token,
            EmployeeUser.fromJson(result.employee),
          );
      state = state.copyWith(status: AuthFlowStatus.success);
      return true;
    } catch (e) {
      state = state.copyWith(
        status: AuthFlowStatus.error,
        errorMessage: e.toString(),
      );
      return false;
    }
  }

  void goBackToEmail() {
    state = state.copyWith(
      status: AuthFlowStatus.idle,
      errorMessage: null,
    );
  }

  void reset() {
    state = const AuthFlowState();
  }
}

final authFlowProvider =
    NotifierProvider<AuthFlowNotifier, AuthFlowState>(AuthFlowNotifier.new);

// ---------------------------------------------------------------------------
// Session — persisted token + employee, used for route guarding
// ---------------------------------------------------------------------------

class SessionState {
  const SessionState({
    this.isLoading = true,
    this.token,
    this.employee,
  });

  final bool isLoading;
  final String? token;
  final EmployeeUser? employee;

  bool get isAuthenticated => token != null && employee != null;
}

class SessionNotifier extends Notifier<SessionState> {
  @override
  SessionState build() {
    _restore();
    return const SessionState();
  }

  Future<void> _restore() async {
    final storage = ref.read(secureStorageProvider);
    final token = await storage.readToken();
    final employeeJson = await storage.readEmployee();

    if (token != null && employeeJson != null) {
      state = SessionState(
        isLoading: false,
        token: token,
        employee: EmployeeUser.fromJson(employeeJson),
      );
    } else {
      state = const SessionState(isLoading: false);
    }
  }

  void _setSession(String token, EmployeeUser employee) {
    state = SessionState(
      isLoading: false,
      token: token,
      employee: employee,
    );
  }

  Future<void> updateToken(String newToken) async {
    final storage = ref.read(secureStorageProvider);
    final employee = state.employee;
    if (employee != null) {
      await storage.saveSession(token: newToken, employee: employee.toJson());
      state = SessionState(
        isLoading: false,
        token: newToken,
        employee: employee,
      );
    }
  }

  Future<void> clear() async {
    await ref.read(secureStorageProvider).clearSession();
    state = const SessionState(isLoading: false);
  }
}

final sessionProvider =
    NotifierProvider<SessionNotifier, SessionState>(SessionNotifier.new);
