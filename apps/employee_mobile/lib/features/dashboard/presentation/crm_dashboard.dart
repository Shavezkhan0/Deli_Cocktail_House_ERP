import 'package:flutter/material.dart';

import 'dashboard_scaffold.dart';

class CrmDashboard extends StatelessWidget {
  const CrmDashboard({super.key, required this.employeeName});

  final String employeeName;

  @override
  Widget build(BuildContext context) {
    return DashboardScaffold(
      designation: 'CRM',
      employeeName: employeeName,
      cards: const [
        DashboardCard(
          title: 'CRM Dashboard',
          description: 'Manage leads, track conversations, and monitor your pipeline.',
          icon: Icons.business_center_rounded,
        ),
        DashboardCard(
          title: 'Recent Activity',
          description: 'View your latest CRM interactions and follow-ups.',
          icon: Icons.history_rounded,
        ),
        DashboardCard(
          title: 'Quick Actions',
          description: 'Create a new lead or update an existing contact.',
          icon: Icons.bolt_rounded,
        ),
      ],
    );
  }
}
