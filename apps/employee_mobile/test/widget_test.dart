import 'package:flutter_test/flutter_test.dart';

import 'package:employee_mobile/main.dart';

void main() {
  testWidgets('App renders login screen', (WidgetTester tester) async {
    await tester.pumpWidget(const EmployeeMobileApp());
    await tester.pumpAndSettle();
    expect(find.text('/login'), findsOneWidget);
  });
}
