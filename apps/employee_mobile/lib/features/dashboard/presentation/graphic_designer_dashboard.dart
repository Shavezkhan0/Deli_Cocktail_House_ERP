import 'package:flutter/material.dart';

import 'dashboard_scaffold.dart';

class GraphicDesignerDashboard extends StatelessWidget {
  const GraphicDesignerDashboard({super.key, required this.employeeName});

  final String employeeName;

  @override
  Widget build(BuildContext context) {
    return DashboardScaffold(
      designation: 'GRAPHIC_DESIGNER',
      employeeName: employeeName,
      cards: const [
        DashboardCard(
          title: 'Design Queue',
          description: 'View pending design requests and assignments.',
          icon: Icons.queue_rounded,
        ),
        DashboardCard(
          title: 'My Projects',
          description: 'Track your ongoing design projects and deadlines.',
          icon: Icons.palette_rounded,
        ),
        DashboardCard(
          title: 'Upload Design',
          description: 'Submit a completed design for review.',
          icon: Icons.upload_file_rounded,
        ),
      ],
    );
  }
}
