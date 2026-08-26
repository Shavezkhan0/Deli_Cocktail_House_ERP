import 'package:intl/intl.dart';

String formatCurrency(double value) {
  return NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0)
      .format(value);
}

String formatDate(String isoString) {
  final date = DateTime.parse(isoString).toLocal();
  return DateFormat('d MMM yyyy').format(date);
}

String formatTime(String isoString) {
  final date = DateTime.parse(isoString).toLocal();
  return DateFormat('h:mm a').format(date);
}

String monthLabel(int month, int year) {
  return DateFormat('MMMM yyyy').format(DateTime(year, month, 1));
}
