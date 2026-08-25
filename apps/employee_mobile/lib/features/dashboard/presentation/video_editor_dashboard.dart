import 'package:flutter/material.dart';

import 'dashboard_scaffold.dart';

class VideoEditorDashboard extends StatelessWidget {
  const VideoEditorDashboard({super.key, required this.employeeName});

  final String employeeName;

  @override
  Widget build(BuildContext context) {
    return DashboardScaffold(
      designation: 'VIDEO_EDITOR',
      employeeName: employeeName,
      cards: const [
        DashboardCard(
          title: 'Edit Queue',
          description: 'View pending video editing assignments.',
          icon: Icons.video_file_rounded,
        ),
        DashboardCard(
          title: 'My Edits',
          description: 'Track progress on your current video projects.',
          icon: Icons.videocam_rounded,
        ),
        DashboardCard(
          title: 'Render Status',
          description: 'Check ongoing renders and export status.',
          icon: Icons.movie_creation_rounded,
        ),
      ],
    );
  }
}
