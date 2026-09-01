-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "EmployeeDesignation" AS ENUM ('CRM', 'GRAPHIC_DESIGNER', 'OPERATION_COORDINATOR', 'DATA_ENTRY_OPERATOR', 'PROCESS_COORDINATOR', 'IT', 'OFFICE_BOY', 'WAREHOUSE_MANAGER', 'VIDEO_EDITOR', 'MARKETING_EXECUTIVE', 'SALES_EXECUTIVE', 'DRIVER');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'SHORT_LEAVE', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "OverrideType" AS ENUM ('FORCE_WORK', 'FORCE_LEAVE');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'LEFT');

-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('SETUP', 'UNIFORM', 'GLASSWARE', 'DISPOSALS', 'CONSUMABLE', 'SYRUP', 'BEVERAGE', 'ENTERTAINMENT', 'CARTS', 'OTHER');

-- CreateEnum
CREATE TYPE "ItemUnit" AS ENUM ('PCS', 'BOX', 'CASES', 'SET', 'PAIR');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AppPlatform" AS ENUM ('ANDROID', 'IOS');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('EVENT_OUT', 'EVENT_IN', 'EVENT_DAMAGE', 'EVENT_LOST', 'ADMIN_INCREASE', 'ADMIN_DECREASE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "FunctionCategory" AS ENUM ('EVENT', 'STANDARD', 'DELIVERABLES');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('SIMPLE', 'LIST', 'TEXT', 'TEXT_WITH_ITEMS', 'TEXT_WITH_SUBITEMS');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "emergencyContact" TEXT,
    "designation" "EmployeeDesignation" NOT NULL DEFAULT 'OFFICE_BOY',
    "baseSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "joiningDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "leavingDate" TIMESTAMP(3),
    "aadharUrl" TEXT,
    "panCardUrl" TEXT,
    "offerLetterUrl" TEXT,
    "bondUrl" TEXT,
    "bankAccountNo" TEXT,
    "bankBranch" TEXT,
    "bankIfsc" TEXT,
    "bankOtherDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "checkInTime" TIMESTAMP(3),
    "checkOutTime" TIMESTAMP(3),
    "checkOutLatitude" DOUBLE PRECISION,
    "checkOutLongitude" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "correctedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "previousStatus" "AttendanceStatus",
    "correctedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" "ItemCategory" NOT NULL,
    "subCategory" TEXT,
    "brand" TEXT,
    "vendor" TEXT,
    "unit" "ItemUnit" NOT NULL,
    "openingStock" INTEGER NOT NULL,
    "currentStock" INTEGER NOT NULL,
    "maxLevel" INTEGER,
    "status" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventCode" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "venue" TEXT NOT NULL,
    "pax" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "crm" TEXT,
    "siteManager" TEXT,
    "siteSupervisor" TEXT,
    "butlerVendor" TEXT,
    "bartenders" INTEGER NOT NULL,
    "maleButler" INTEGER NOT NULL,
    "femaleButler" INTEGER NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientEmail" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'UPCOMING',
    "inventoryCost" DOUBLE PRECISION NOT NULL,
    "staffCost" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "crmEmployeeId" TEXT,
    "siteManagerId" TEXT,
    "siteSupervisorId" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventCrmChecklistItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "section" TEXT NOT NULL DEFAULT 'General',
    "label" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventCrmChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventInventory" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "requiredQuantity" INTEGER NOT NULL,
    "reserveQuantity" INTEGER NOT NULL,
    "issueQuantity" INTEGER NOT NULL,
    "remarks" TEXT NOT NULL,

    CONSTRAINT "EventInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventReturnSummary" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "issuedQuantity" INTEGER NOT NULL,
    "returnedQuantity" INTEGER NOT NULL,
    "damagedQuantity" INTEGER NOT NULL,
    "lostQuantity" INTEGER NOT NULL,
    "consumedQuantity" INTEGER NOT NULL,
    "remarks" TEXT NOT NULL,

    CONSTRAINT "EventReturnSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "eventId" TEXT,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "remark" TEXT,
    "createdByAdminId" TEXT,
    "createdByEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complain" (
    "id" TEXT NOT NULL,
    "complainId" TEXT NOT NULL,
    "siteManagerName" TEXT NOT NULL,
    "eventId" TEXT,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Complain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Salary" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "paidDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Salary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyScore" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "score" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "assignedBy" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorContact" (
    "id" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "eventId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseEntry" (
    "id" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "eventId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "receiptUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelDetail" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "eventId" TEXT,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "travelDate" TIMESTAMP(3) NOT NULL,
    "mode" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "eventId" TEXT,
    "itemName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdfCompanySettings" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "headerLogoUrl" TEXT,
    "address" TEXT,
    "phone1" TEXT,
    "phone2" TEXT,
    "email" TEXT,
    "footerText" TEXT,
    "defaultFont" TEXT NOT NULL DEFAULT 'Helvetica',
    "defaultTheme" TEXT NOT NULL DEFAULT 'modern',
    "defaultTerms" TEXT,
    "defaultDeliverables" JSONB,
    "defaultMixers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PdfCompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdfEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "venue" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "eventType" TEXT,
    "packageType" TEXT,
    "packagePax" INTEGER,
    "clientName" TEXT,
    "clientContact" TEXT,
    "specialInstructions" TEXT,
    "pdfTitle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "deliverables" JSONB,
    "mixers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PdfEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdfFunction" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "functionName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "pax" INTEGER,
    "bartenders" INTEGER,
    "butlers" INTEGER,
    "siteManager" TEXT,
    "theme" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "templateData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PdfFunction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalFunctionTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "FunctionCategory" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProposalFunctionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalBlockTemplate" (
    "id" TEXT NOT NULL,
    "functionId" TEXT NOT NULL,
    "type" "BlockType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "value" TEXT,
    "description" TEXT,
    "items" JSONB,

    CONSTRAINT "ProposalBlockTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventProposal" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "guestCount" INTEGER NOT NULL,
    "companyName" TEXT,
    "companyAddress" TEXT,
    "companyContact" TEXT,
    "companyEmail" TEXT,
    "companyFooterText" TEXT,
    "teamFlowJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventProposalFunction" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "functionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "overrideJson" JSONB,

    CONSTRAINT "EventProposalFunction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusM" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignationLocation" (
    "id" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "locationName" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusM" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignationLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceOverride" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "OverrideType" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkFromHomeDay" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkFromHomeDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppVersion" (
    "id" TEXT NOT NULL,
    "platform" "AppPlatform" NOT NULL,
    "latestVersionCode" INTEGER NOT NULL,
    "latestVersionName" TEXT NOT NULL,
    "minSupportedVersionCode" INTEGER NOT NULL,
    "apkUrl" TEXT,
    "releaseNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeId_key" ON "Employee"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Item_sku_key" ON "Item"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Event_eventCode_key" ON "Event"("eventCode");

-- CreateIndex
CREATE INDEX "EventCrmChecklistItem_eventId_idx" ON "EventCrmChecklistItem"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Complain_complainId_key" ON "Complain"("complainId");

-- CreateIndex
CREATE UNIQUE INDEX "Salary_employeeId_month_year_key" ON "Salary"("employeeId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "AppSettings_key_key" ON "AppSettings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyScore_employeeId_weekStart_key" ON "WeeklyScore"("employeeId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "PdfEvent_eventId_key" ON "PdfEvent"("eventId");

-- CreateIndex
CREATE INDEX "PdfFunction_eventId_idx" ON "PdfFunction"("eventId");

-- CreateIndex
CREATE INDEX "EventProposalFunction_proposalId_idx" ON "EventProposalFunction"("proposalId");

-- CreateIndex
CREATE INDEX "EventProposalFunction_functionId_idx" ON "EventProposalFunction"("functionId");

-- CreateIndex
CREATE UNIQUE INDEX "DesignationLocation_designation_key" ON "DesignationLocation"("designation");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_date_key" ON "Holiday"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceOverride_employeeId_date_key" ON "AttendanceOverride"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WorkFromHomeDay_employeeId_date_key" ON "WorkFromHomeDay"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AppVersion_platform_key" ON "AppVersion"("platform");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_crmEmployeeId_fkey" FOREIGN KEY ("crmEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_siteManagerId_fkey" FOREIGN KEY ("siteManagerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_siteSupervisorId_fkey" FOREIGN KEY ("siteSupervisorId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCrmChecklistItem" ADD CONSTRAINT "EventCrmChecklistItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInventory" ADD CONSTRAINT "EventInventory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInventory" ADD CONSTRAINT "EventInventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventReturnSummary" ADD CONSTRAINT "EventReturnSummary_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventReturnSummary" ADD CONSTRAINT "EventReturnSummary_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Salary" ADD CONSTRAINT "Salary_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyScore" ADD CONSTRAINT "WeeklyScore_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorContact" ADD CONSTRAINT "VendorContact_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEntry" ADD CONSTRAINT "ExpenseEntry_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelDetail" ADD CONSTRAINT "TravelDetail_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfFunction" ADD CONSTRAINT "PdfFunction_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PdfEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalBlockTemplate" ADD CONSTRAINT "ProposalBlockTemplate_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "ProposalFunctionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventProposalFunction" ADD CONSTRAINT "EventProposalFunction_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "EventProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventProposalFunction" ADD CONSTRAINT "EventProposalFunction_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "ProposalFunctionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceOverride" ADD CONSTRAINT "AttendanceOverride_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkFromHomeDay" ADD CONSTRAINT "WorkFromHomeDay_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
