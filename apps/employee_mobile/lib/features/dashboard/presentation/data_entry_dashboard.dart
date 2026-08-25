import 'package:flutter/material.dart';

import 'dashboard_scaffold.dart';

class DataEntryDashboard extends StatelessWidget {
  const DataEntryDashboard({super.key, required this.employeeName});

  final String employeeName;

  @override
  Widget build(BuildContext context) {
    return DashboardScaffold(
      designation: 'DATA_ENTRY_OPERATOR',
      employeeName: employeeName,
      cards: const [
        DashboardCard(
          title: 'Data Entry Queue',
          description: 'View pending data entry tasks and submissions.',
          icon: Icons.input_rounded,
        ),
        DashboardCard(
          title: 'Recent Entries',
          description: 'Review your latest data entries for accuracy.',
          icon: Icons.fact_check_rounded,
        ),
        DashboardCard(
          title: 'Reports',
          description: 'Check data quality and completion reports.',
          icon: Icons.assessment_rounded,
        ),
      ],
    );
  }
}
