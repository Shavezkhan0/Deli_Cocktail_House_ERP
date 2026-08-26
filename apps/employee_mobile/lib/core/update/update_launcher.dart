import 'dart:io' show Platform;

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';

import 'update_repository.dart';

// TODO: replace with the real TestFlight invite link once the app is uploaded
// to App Store Connect.
const _iosTestFlightUrl = 'https://testflight.apple.com/join/REPLACE_ME';

/// Downloads the APK (Android) or opens TestFlight (iOS) for the given
/// [PlatformVersionInfo]. Shows a progress dialog during download and surfaces
/// errors so the user can retry.
Future<void> launchUpdate(
  BuildContext context,
  PlatformVersionInfo info,
  Dio dio,
) async {
  if (Platform.isIOS) {
    final uri = Uri.parse(_iosTestFlightUrl);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
    return;
  }

  // Android — need an apkUrl to proceed.
  final apkUrl = info.apkUrl;
  if (apkUrl == null || apkUrl.isEmpty) return;

  if (!context.mounted) return;

  // ── download progress dialog ──────────────────────────────────────────
  final progress = ValueNotifier<double>(0);
  final dialogContext = _DownloaderDialog.show(context, progress);

  try {
    final dir = await getTemporaryDirectory();
    final savePath = '${dir.path}/dch_employee_v${info.latestVersionCode}.apk';

    await dio.download(
      apkUrl,
      savePath,
      onReceiveProgress: (received, total) {
        if (total > 0) {
          progress.value = received / total;
        }
      },
    );

    // Close the progress dialog.
    if (dialogContext.mounted) {
      Navigator.of(dialogContext, rootNavigator: true).pop();
    }

    if (!context.mounted) return;

    // Hand the APK off to the system installer.
    final result = await OpenFilex.open(savePath);
    if (result.type != ResultType.done && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Could not open the downloaded file: ${result.message}'),
        ),
      );
    }
  } catch (e) {
    // Close the progress dialog on error too.
    if (dialogContext.mounted) {
      Navigator.of(dialogContext, rootNavigator: true).pop();
    }

    if (!context.mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Download failed. Please try again. ($e)')),
    );
  } finally {
    progress.dispose();
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/// Shows a non-dismissible dialog with a linear progress indicator and returns
/// its BuildContext so the caller can pop it later.
class _DownloaderDialog {
  static BuildContext show(BuildContext context, ValueNotifier<double> progress) {
    late BuildContext dialogCtx;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        dialogCtx = ctx;
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Downloading update…',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 20),
              ValueListenableBuilder<double>(
                valueListenable: progress,
                builder: (_, value, _) => Column(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: value > 0 ? value : null,
                        minHeight: 6,
                        backgroundColor: const Color(0xFFE5E5E5),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      value > 0 ? '${(value * 100).toStringAsFixed(0)}%' : '',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF737373),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
    return dialogCtx;
  }
}
