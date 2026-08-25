const List<String> designations = [
  'CRM',
  'GRAPHIC_DESIGNER',
  'OPERATION_COORDINATOR',
  'DATA_ENTRY_OPERATOR',
  'PROCESS_COORDINATOR',
  'IT',
  'OFFICE_BOY',
  'WAREHOUSE_MANAGER',
  'VIDEO_EDITOR',
  'MARKETING_EXECUTIVE',
  'SALES_EXECUTIVE',
  'DRIVER',
];

String humanizeDesignation(String designation) {
  return designation
      .split('_')
      .map((part) => '${part[0].toUpperCase()}${part.substring(1).toLowerCase()}')
      .join(' ');
}
