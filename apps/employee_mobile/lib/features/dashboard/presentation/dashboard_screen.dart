import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../features/auth/data/auth_provider.dart';
import 'crm_dashboard.dart';
import 'graphic_designer_dashboard.dart';
import 'operation_coordinator_dashboard.dart';
import 'data_entry_dashboard.dart';
import 'process_coordinator_dashboard.dart';
import 'it_dashboard.dart';
import 'office_boy_dashboard.dart';
import 'warehouse_dashboard.dart';
import 'video_editor_dashboard.dart';
import 'marketing_dashboard.dart';
import 'sales_dashboard.dart';
import 'driver_dashboard.dart';
import 'default_dashboard.dart';

typedef DashboardBuilder = Widget Function(String employeeName);

final Map<String, DashboardBuilder> _dashboardBuilders = {
  'CRM': (name) => CrmDashboard(employeeName: name),
  'GRAPHIC_DESIGNER': (name) => GraphicDesignerDashboard(employeeName: name),
  'OPERATION_COORDINATOR': (name) => OperationCoordinatorDashboard(employeeName: name),
  'DATA_ENTRY_OPERATOR': (name) => DataEntryDashboard(employeeName: name),
  'PROCESS_COORDINATOR': (name) => ProcessCoordinatorDashboard(employeeName: name),
  'IT': (name) => ItDashboard(employeeName: name),
  'OFFICE_BOY': (name) => OfficeBoyDashboard(employeeName: name),
  'WAREHOUSE_MANAGER': (name) => WarehouseDashboard(employeeName: name),
  'VIDEO_EDITOR': (name) => VideoEditorDashboard(employeeName: name),
  'MARKETING_EXECUTIVE': (name) => MarketingDashboard(employeeName: name),
  'SALES_EXECUTIVE': (name) => SalesDashboard(employeeName: name),
  'DRIVER': (name) => DriverDashboard(employeeName: name),
};

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final employee = session.employee;
    final designation = employee?.designation ?? '';
    final name = employee?.name ?? '';

    final builder = _dashboardBuilders[designation];
    return builder != null
        ? builder(name)
        : DefaultDashboard(employeeName: name, designation: designation);
  }
}
