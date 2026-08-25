import 'package:flutter/material.dart';

import 'dashboard_scaffold.dart';

class OperationCoordinatorDashboard extends StatelessWidget {
  const OperationCoordinatorDashboard({super.key, required this.employeeName});

  final String employeeName;

  @override
  Widget build(BuildContext context) {
    return DashboardScaffold(
      designation: 'OPERATION_COORDINATOR',
      employeeName: employeeName,
      cards: const [
        DashboardCard(
          title: 'Operations Overview',
          description: 'Monitor daily operations and task assignments.',
          icon: Icons.sync_rounded,
        ),
        DashboardCard(
          title: 'Team Status',
          description: 'Check team availability and workload distribution.',
          icon: Icons.groups_rounded,
        ),
        DashboardCard(
          title: 'Tasks',
          description: 'Manage and track operational tasks.',
          icon: Icons.task_alt_rounded,
        ),
      ],
    );
  }
}
