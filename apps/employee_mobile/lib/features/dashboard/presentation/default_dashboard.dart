import 'package:flutter/material.dart';

import 'dashboard_scaffold.dart';

class DefaultDashboard extends StatelessWidget {
  const DefaultDashboard({super.key, required this.employeeName, this.designation = ''});

  final String employeeName;
  final String designation;

  @override
  Widget build(BuildContext context) {
    return DashboardScaffold(
      designation: designation,
      employeeName: employeeName,
      cards: const [
        DashboardCard(
          title: 'Welcome',
          description: 'This is your employee dashboard. More features coming soon.',
          icon: Icons.dashboard_rounded,
        ),
      ],
    );
  }
}
