import 'package:flutter/material.dart';

import 'dashboard_scaffold.dart';

class OfficeBoyDashboard extends StatelessWidget {
  const OfficeBoyDashboard({super.key, required this.employeeName});

  final String employeeName;

  @override
  Widget build(BuildContext context) {
    return DashboardScaffold(
      designation: 'OFFICE_BOY',
      employeeName: employeeName,
      cards: const [
        DashboardCard(
          title: 'Daily Tasks',
          description: 'View your assigned tasks for today.',
          icon: Icons.checklist_rounded,
        ),
        DashboardCard(
          title: 'Supplies',
          description: 'Track office supply requests and deliveries.',
          icon: Icons.inventory_2_rounded,
        ),
      ],
    );
  }
}
