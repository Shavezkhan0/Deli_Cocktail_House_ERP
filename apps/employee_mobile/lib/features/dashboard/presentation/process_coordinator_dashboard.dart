import 'package:flutter/material.dart';

import 'dashboard_scaffold.dart';

class ProcessCoordinatorDashboard extends StatelessWidget {
  const ProcessCoordinatorDashboard({super.key, required this.employeeName});

  final String employeeName;

  @override
  Widget build(BuildContext context) {
    return DashboardScaffold(
      designation: 'PROCESS_COORDINATOR',
      employeeName: employeeName,
      cards: const [
        DashboardCard(
          title: 'Process Pipeline',
          description: 'Track active workflows and process stages.',
          icon: Icons.account_tree_rounded,
        ),
        DashboardCard(
          title: 'Pending Approvals',
          description: 'Review and approve pending process requests.',
          icon: Icons.approval_rounded,
        ),
        DashboardCard(
          title: 'Process Health',
          description: 'Monitor process efficiency and bottlenecks.',
          icon: Icons.monitor_heart_rounded,
        ),
      ],
    );
  }
}
