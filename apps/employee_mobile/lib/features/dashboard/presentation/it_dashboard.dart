import 'package:flutter/material.dart';

import 'dashboard_scaffold.dart';

class ItDashboard extends StatelessWidget {
  const ItDashboard({super.key, required this.employeeName});

  final String employeeName;

  @override
  Widget build(BuildContext context) {
    return DashboardScaffold(
      designation: 'IT',
      employeeName: employeeName,
      cards: const [
        DashboardCard(
          title: 'System Status',
          description: 'Monitor infrastructure health and uptime.',
          icon: Icons.dns_rounded,
        ),
        DashboardCard(
          title: 'Support Tickets',
          description: 'View and resolve IT support requests.',
          icon: Icons.support_agent_rounded,
        ),
        DashboardCard(
          title: 'Deployments',
          description: 'Track recent and pending deployments.',
          icon: Icons.rocket_launch_rounded,
        ),
      ],
    );
  }
}
