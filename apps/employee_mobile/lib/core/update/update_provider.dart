import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../features/auth/data/auth_provider.dart';
import 'update_repository.dart';

enum UpdateStatus { none, optional, mandatory }

class UpdateState {
  const UpdateState({
    this.status = UpdateStatus.none,
    this.versionInfo,
  });

  final UpdateStatus status;
  final PlatformVersionInfo? versionInfo;
}

class UpdateNotifier extends Notifier<UpdateState> {
  @override
  UpdateState build() {
    _check();
    return const UpdateState();
  }

  Future<void> _check() async {
    final storage = ref.read(secureStorageProvider);
    final repository = UpdateRepository(ref.read(apiClientProvider).dio);

    final versionInfo = await repository.getVersionInfo();
    if (versionInfo == null) return;

    final packageInfo = await PackageInfo.fromPlatform();
    final currentBuildNumber = int.tryParse(packageInfo.buildNumber) ?? 0;

    UpdateStatus status;
    if (currentBuildNumber < versionInfo.minSupportedVersionCode) {
      status = UpdateStatus.mandatory;
    } else if (currentBuildNumber < versionInfo.latestVersionCode) {
      final dismissedVersion = await storage.readDismissedUpdateVersion();
      if (dismissedVersion == versionInfo.latestVersionCode) {
        status = UpdateStatus.none;
      } else {
        status = UpdateStatus.optional;
      }
    } else {
      status = UpdateStatus.none;
    }

    state = UpdateState(status: status, versionInfo: versionInfo);
  }

  Future<void> dismiss() async {
    final versionInfo = state.versionInfo;
    if (versionInfo == null) return;

    final storage = ref.read(secureStorageProvider);
    await storage.saveDismissedUpdateVersion(versionInfo.latestVersionCode);
    state = const UpdateState();
  }
}

final updateProvider =
    NotifierProvider<UpdateNotifier, UpdateState>(UpdateNotifier.new);
