import 'package:flutter/material.dart';

import 'dashboard_scaffold.dart';

class SalesDashboard extends StatelessWidget {
  const SalesDashboard({super.key, required this.employeeName});

  final String employeeName;

  @override
  Widget build(BuildContext context) {
    return DashboardScaffold(
      designation: 'SALES_EXECUTIVE',
      employeeName: employeeName,
      cards: const [
        DashboardCard(
          title: 'Sales Pipeline',
          description: 'Track your leads, deals, and conversion rates.',
          icon: Icons.trending_up_rounded,
        ),
        DashboardCard(
          title: 'Today\'s Targets',
          description: 'View your daily sales targets and progress.',
          icon: Icons.gps_fixed_rounded,
        ),
        DashboardCard(
          title: 'Client Follow-ups',
          description: 'Manage scheduled follow-ups and reminders.',
          icon: Icons.follow_the_signs_rounded,
        ),
      ],
    );
  }
}
