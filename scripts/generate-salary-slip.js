const fs = require('fs');
const PDFDocument = require('../apps/pdf-maker/node_modules/pdfkit');

// Example employee data
const employeeData = {
    employeeId: 'DCH-002',
    name: 'Shavez Khan',
    designation: 'Software Engineer',
    department: 'IT',
    month: 'September',
    year: '2026',
    earnings: {
        basicSalary: 25000,
        hra: 25000,
        conveyance: 0,
        specialAllowance: 0,
    },
    deductions: {
        pf: 0,
        tax: 0,
    },
    attendance: {
        present: 24,
        half: 0,
        short: 0,
        onLeave: 0,
        absent: 1
    },
    paidLeaveBalance: 0
};

function generateSalarySlip(data, outputPath) {
    const doc = new PDFDocument({ margin: 50 });
    
    // Pipe its output somewhere, like to a file or HTTP response
    // See below for browser usage
    doc.pipe(fs.createWriteStream(outputPath));
    
    // Header
    doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('Deli Cocktail House', { align: 'center' })
        .moveDown(0.5);
    
    doc
        .fontSize(12)
        .font('Helvetica')
        .text('Salary Slip', { align: 'center' })
        .moveDown(0.5)
        .text(`For the Month of ${data.month} ${data.year}`, { align: 'center' })
        .moveDown(2);

    // Employee Details
    doc.font('Helvetica-Bold').text('Employee Details:');
    doc.moveDown(0.5);
    
    doc.font('Helvetica').fontSize(10);
    const detailsX = 50;
    const detailsY = doc.y;
    
    doc.text(`Employee ID: ${data.employeeId}`, detailsX, detailsY);
    doc.text(`Name: ${data.name}`, detailsX, detailsY + 15);
    doc.text(`Designation: ${data.designation}`, detailsX + 250, detailsY);
    doc.text(`Department: ${data.department}`, detailsX + 250, detailsY + 15);
    doc.moveDown(2);
    
    // Attendance Details
    const attendanceY = doc.y;
    doc.font('Helvetica-Bold').text('Attendance Details:', detailsX, attendanceY);
    doc.font('Helvetica').fontSize(10);
    const attendanceStr = `${data.attendance.present} present · ${data.attendance.half} half · ${data.attendance.short} short · ${data.attendance.onLeave} on leave · ${data.attendance.absent} absent`;
    doc.text(`Attendance: ${attendanceStr}`, detailsX, attendanceY + 15);
    doc.text(`Paid-leave balance carried forward: ${data.paidLeaveBalance}`, detailsX, attendanceY + 30);
    
    doc.moveDown(3);

    // Earnings and Deductions Table
    const tableTop = doc.y;
    
    // Draw table header
    doc.font('Helvetica-Bold');
    doc.text('Earnings', 50, tableTop);
    doc.text('Amount (Rs)', 200, tableTop);
    doc.text('Deductions', 300, tableTop);
    doc.text('Amount (Rs)', 450, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    doc.font('Helvetica');
    let currentY = tableTop + 25;
    
    let totalEarnings = 0;
    for (const [key, value] of Object.entries(data.earnings)) {
        doc.text(key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), 50, currentY);
        doc.text(value.toString(), 200, currentY);
        totalEarnings += value;
        currentY += 15;
    }
    
    let deductionY = tableTop + 25;
    let totalDeductions = 0;
    for (const [key, value] of Object.entries(data.deductions)) {
        doc.text(key.toUpperCase(), 300, deductionY);
        doc.text(value.toString(), 450, deductionY);
        totalDeductions += value;
        deductionY += 15;
    }
    
    const finalY = Math.max(currentY, deductionY) + 10;
    doc.moveTo(50, finalY).lineTo(550, finalY).stroke();
    
    doc.font('Helvetica-Bold');
    doc.text('Total Earnings', 50, finalY + 10);
    doc.text(totalEarnings.toString(), 200, finalY + 10);
    
    doc.text('Total Deductions', 300, finalY + 10);
    doc.text(totalDeductions.toString(), 450, finalY + 10);
    
    doc.moveTo(50, finalY + 30).lineTo(550, finalY + 30).stroke();
    
    const netSalary = totalEarnings - totalDeductions;
    doc.fontSize(12).text(`Net Salary: Rs ${netSalary}`, 50, finalY + 45);
    
    // Finalize PDF file
    doc.end();
    console.log(`Salary slip generated successfully at ${outputPath}`);
}

const outputFileName = `Salary_Slip_${employeeData.employeeId}_${employeeData.month}_${employeeData.year}.pdf`;
generateSalarySlip(employeeData, outputFileName);
