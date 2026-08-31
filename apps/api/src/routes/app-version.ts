import { Router } from "express";
import { prisma, AppPlatform } from "@repo/database";
import { requireAuth } from "../middleware/requireAuth";

const router: Router = Router();

const VALID_PLATFORMS = new Set<string>(Object.values(AppPlatform));

// ── Public: mobile app calls this to check for updates ──────────────
router.get("/", async (_req, res) => {
  try {
    const rows = await prisma.appVersion.findMany();

    const result: Record<string, object> = {};
    for (const row of rows) {
      const key = row.platform.toLowerCase();
      result[key] = {
        latestVersionCode: row.latestVersionCode,
        latestVersionName: row.latestVersionName,
        minSupportedVersionCode: row.minSupportedVersionCode,
        apkUrl: row.apkUrl,
        releaseNotes: row.releaseNotes,
      };
    }

    res.json(result);
  } catch (err) {
    console.error("[AppVersion] Failed to fetch version info:", err);
    res.status(500).json({ message: "Failed to fetch version info" });
  }
});

// ── Admin: update version info for a platform ──────────────────────
router.put("/:platform", requireAuth, async (req, res) => {
  const platform = req.params.platform;

  if (!platform || !VALID_PLATFORMS.has(platform)) {
    return res.status(400).json({ message: "Invalid platform. Must be ANDROID or IOS." });
  }

  const { latestVersionCode, latestVersionName, minSupportedVersionCode, apkUrl, releaseNotes } = req.body;

  if (typeof latestVersionCode !== "number" || typeof latestVersionName !== "string" || typeof minSupportedVersionCode !== "number") {
    return res.status(400).json({
      message: "latestVersionCode (number), latestVersionName (string), and minSupportedVersionCode (number) are required",
    });
  }

  try {
    const updated = await prisma.appVersion.upsert({
      where: { platform: platform as AppPlatform },
      update: {
        latestVersionCode,
        latestVersionName,
        minSupportedVersionCode,
        apkUrl: apkUrl ?? null,
        releaseNotes: releaseNotes ?? null,
      },
      create: {
        platform: platform as AppPlatform,
        latestVersionCode,
        latestVersionName,
        minSupportedVersionCode,
        apkUrl: apkUrl ?? null,
        releaseNotes: releaseNotes ?? null,
      },
    });

    res.json({
      platform: updated.platform,
      latestVersionCode: updated.latestVersionCode,
      latestVersionName: updated.latestVersionName,
      minSupportedVersionCode: updated.minSupportedVersionCode,
      apkUrl: updated.apkUrl,
      releaseNotes: updated.releaseNotes,
      updatedAt: updated.updatedAt,
    });
  } catch (err) {
    console.error("[AppVersion] Failed to update version:", err);
    res.status(500).json({ message: "Failed to update version" });
  }
});

export default router;
