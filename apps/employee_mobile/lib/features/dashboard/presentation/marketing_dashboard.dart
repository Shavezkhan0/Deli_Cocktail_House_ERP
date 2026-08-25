import 'package:flutter/material.dart';

import 'dashboard_scaffold.dart';

class MarketingDashboard extends StatelessWidget {
  const MarketingDashboard({super.key, required this.employeeName});

  final String employeeName;

  @override
  Widget build(BuildContext context) {
    return DashboardScaffold(
      designation: 'MARKETING_EXECUTIVE',
      employeeName: employeeName,
      cards: const [
        DashboardCard(
          title: 'Campaign Overview',
          description: 'View active marketing campaigns and their performance.',
          icon: Icons.campaign_rounded,
        ),
        DashboardCard(
          title: 'Content Calendar',
          description: 'Check upcoming content schedules and deadlines.',
          icon: Icons.calendar_month_rounded,
        ),
        DashboardCard(
          title: 'Analytics',
          description: 'Monitor engagement metrics and reach.',
          icon: Icons.analytics_rounded,
        ),
      ],
    );
  }
}
