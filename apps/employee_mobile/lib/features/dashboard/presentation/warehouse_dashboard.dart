import 'package:flutter/material.dart';

import 'dashboard_scaffold.dart';

class WarehouseDashboard extends StatelessWidget {
  const WarehouseDashboard({super.key, required this.employeeName});

  final String employeeName;

  @override
  Widget build(BuildContext context) {
    return DashboardScaffold(
      designation: 'WAREHOUSE_MANAGER',
      employeeName: employeeName,
      cards: const [
        DashboardCard(
          title: 'Inventory Overview',
          description: 'Monitor stock levels and inventory health.',
          icon: Icons.warehouse_rounded,
        ),
        DashboardCard(
          title: 'Incoming Shipments',
          description: 'Track pending and in-transit shipments.',
          icon: Icons.local_shipping_rounded,
        ),
        DashboardCard(
          title: 'Stock Alerts',
          description: 'View low-stock alerts and reorder suggestions.',
          icon: Icons.warning_amber_rounded,
        ),
      ],
    );
  }
}
