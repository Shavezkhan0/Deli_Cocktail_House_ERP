-- AlterEnum
ALTER TYPE "ItemUnit" ADD VALUE 'CASES';
ALTER TYPE "ItemUnit" ADD VALUE 'SET';
ALTER TYPE "ItemUnit" ADD VALUE 'PAIR';

-- AlterEnum
ALTER TYPE "ItemCategory" ADD VALUE 'SYRUP';
ALTER TYPE "ItemCategory" ADD VALUE 'BEVERAGE';
ALTER TYPE "ItemCategory" ADD VALUE 'ENTERTAINMENT';
ALTER TYPE "ItemCategory" ADD VALUE 'CARTS';
ALTER TYPE "ItemCategory" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "Item" ADD COLUMN "maxLevel" INTEGER;

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('EVENT_OUT', 'EVENT_IN', 'EVENT_DAMAGE', 'ADMIN_INCREASE', 'ADMIN_DECREASE');

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

-- CreateIndex
CREATE INDEX "StockMovement_itemId_idx" ON "StockMovement"("itemId");

-- CreateIndex
CREATE INDEX "StockMovement_eventId_idx" ON "StockMovement"("eventId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
