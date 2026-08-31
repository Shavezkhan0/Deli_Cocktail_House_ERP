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
CREATE UNIQUE INDEX "AppVersion_platform_key" ON "AppVersion"("platform");

-- Seed Android row
INSERT INTO "AppVersion" ("id", "platform", "latestVersionCode", "latestVersionName", "minSupportedVersionCode", "apkUrl", "releaseNotes", "updatedAt")
VALUES ('appver_android', 'ANDROID', 2, '2.0.0', 2, NULL, 'Initial v2 release', CURRENT_TIMESTAMP);

-- Seed iOS row
INSERT INTO "AppVersion" ("id", "platform", "latestVersionCode", "latestVersionName", "minSupportedVersionCode", "apkUrl", "releaseNotes", "updatedAt")
VALUES ('appver_ios', 'IOS', 2, '2.0.0', 2, NULL, 'Initial v2 release', CURRENT_TIMESTAMP);
