import 'package:flutter/material.dart';

import 'dashboard_scaffold.dart';

class DriverDashboard extends StatelessWidget {
  const DriverDashboard({super.key, required this.employeeName});

  final String employeeName;

  @override
  Widget build(BuildContext context) {
    return DashboardScaffold(
      designation: 'DRIVER',
      employeeName: employeeName,
      cards: const [
        DashboardCard(
          title: 'Today\'s Routes',
          description: 'View your assigned routes and deliveries.',
          icon: Icons.route_rounded,
        ),
        DashboardCard(
          title: 'Delivery Status',
          description: 'Track completed and pending deliveries.',
          icon: Icons.delivery_dining_rounded,
        ),
      ],
    );
  }
}
