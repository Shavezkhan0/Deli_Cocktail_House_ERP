import { SalaryBreakdown } from "./salary-calculator";
import { CompanyDetails, designationLabel } from "./salary-pdf";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Excel opens .csv as a worksheet. Prefix a BOM so it reads UTF-8 correctly.
const BOM = "﻿";

function cell(value: string | number): string {
  const s = value === undefined || value === null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function row(cells: (string | number)[]): string {
  return cells.map(cell).join(",");
}

function money2(n: number): number {
  return Math.round(n * 100) / 100;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildPayrollSummaryCsv(
  company: CompanyDetails,
  month: number,
  year: number,
  rows: {
    employeeId: string;
    name: string;
    designation: string;
    baseSalary: number;
    thisMonthSalary: number;
  }[],
): string {
  const lines: string[] = [];
  lines.push(row([company.companyName || "Deli Cocktail House"]));
  if (company.address) lines.push(row([company.address]));
  lines.push(row([`Payroll Summary - ${MONTH_NAMES[month - 1]} ${year}`]));
  lines.push(
    row([`Generated ${todayISO()}`, `Employees: ${rows.length}`]),
  );
  lines.push("");
  lines.push(
    row([
      "Employee ID",
      "Name",
      "Designation",
      "Base Salary",
      "This Month Salary",
    ]),
  );

  let totalBase = 0;
  let totalNet = 0;
  for (const r of rows) {
    totalBase += r.baseSalary;
    totalNet += r.thisMonthSalary;
    lines.push(
      row([
        r.employeeId,
        r.name,
        designationLabel(r.designation),
        money2(r.baseSalary),
        money2(r.thisMonthSalary),
      ]),
    );
  }
  lines.push(row(["", "", "TOTAL", money2(totalBase), money2(totalNet)]));

  return BOM + lines.join("\r\n") + "\r\n";
}

export function buildSalarySlipCsv(
  breakdown: SalaryBreakdown & {
    employee: { designation: string; joiningDate: Date };
  },
  company: CompanyDetails,
): string {
  const b = breakdown;
  const dw = b.dailyWage;
  const leaveDeduct = money2(b.paidLeave.overageDays * dw);
  const shortDeduct = money2(b.shortLeave.overageDays * dw);
  const lines: string[] = [];

  lines.push(row([company.companyName || "Deli Cocktail House"]));
  if (company.address) lines.push(row([company.address]));
  lines.push(row([`Salary Slip - ${MONTH_NAMES[b.month - 1]} ${b.year}`]));
  lines.push(row([`Generated ${todayISO()}`]));
  lines.push("");

  lines.push(row(["Field", "Value"]));
  lines.push(row(["Employee ID", b.employeeNumber]));
  lines.push(row(["Name", b.employeeName]));
  lines.push(row(["Designation", designationLabel(b.employee.designation)]));
  lines.push(
    row([
      "Date of Joining",
      new Date(b.employee.joiningDate).toISOString().slice(0, 10),
    ]),
  );
  lines.push(row(["Days in Month", b.daysInMonth]));
  lines.push(row(["Base Salary", money2(b.baseSalary)]));
  lines.push(row(["Daily Wage", money2(dw)]));
  lines.push("");

  lines.push(row(["Attendance", ""]));
  lines.push(row(["Present", b.attendance.PRESENT]));
  lines.push(row(["Half Day", b.attendance.HALF_DAY]));
  lines.push(row(["Short Leave", b.attendance.SHORT_LEAVE]));
  lines.push(row(["On Leave", b.attendance.ON_LEAVE]));
  lines.push(row(["Absent", b.attendance.ABSENT]));
  lines.push("");

  lines.push(row(["Leave", ""]));
  lines.push(row(["Paid leave carried from last month", b.paidLeave.opening]));
  lines.push(row(["Paid leave earned this month", b.paidLeave.grantedThisMonth]));
  lines.push(row(["Paid leave used this month", b.paidLeave.usedThisMonth]));
  lines.push(row(["Paid leave carried to next month", b.paidLeave.closing]));
  lines.push(row(["Short leave allowance", b.shortLeave.allowance]));
  lines.push(row(["Short leave used", b.shortLeave.usedThisMonth]));
  lines.push(row(["Short leave remaining", b.shortLeave.remaining]));
  lines.push("");

  lines.push(row(["Earnings / Deductions", "Amount"]));
  lines.push(row(["Base Salary", money2(b.baseSalary)]));
  lines.push(
    row([
      `Holiday / Sunday work (${b.holidayWork.extraDays} d)`,
      money2(b.extraEarnings),
    ]),
  );
  lines.push(row(["Approved expenses", money2(b.extraExpenses)]));
  lines.push(
    row([`Unpaid leave (${b.paidLeave.overageDays} d)`, -leaveDeduct]),
  );
  lines.push(
    row([`Short-leave overage (${b.shortLeave.overageDays} d)`, -shortDeduct]),
  );
  lines.push(row(["Total Deductions", -money2(b.deductionAmount)]));
  lines.push(row(["NET PAYABLE", money2(b.finalAmount)]));

  return BOM + lines.join("\r\n") + "\r\n";
}