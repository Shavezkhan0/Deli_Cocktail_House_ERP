import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import path from "node:path";
import { supabase, EMPLOYEE_DOCUMENTS_BUCKET } from "../lib/supabase";
import { requireAuth } from "../middleware/requireAuth";

const router: Router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and image files are allowed"));
    }
  },
});

function singleFile(fieldName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.single(fieldName)(req, res, (err: unknown) => {
      if (err) {
        const message =
          err instanceof multer.MulterError
            ? err.code === "LIMIT_FILE_SIZE"
              ? "File too large (max 10MB)"
              : err.message
            : err instanceof Error
              ? err.message
              : "Upload failed";
        return res.status(400).json({ message });
      }
      return next();
    });
  };
}

function safeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

router.post(
  "/employee-document",
  requireAuth,
  singleFile("file"),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const employeeId = typeof req.body.employeeId === "string" ? req.body.employeeId : "unassigned";
      const docType = typeof req.body.docType === "string" ? req.body.docType : "document";
      const oldPath = typeof req.body.oldPath === "string" ? req.body.oldPath.trim() : "";

      const storagePath = `${employeeId}/${docType}/${Date.now()}-${safeFilename(file.originalname)}`;

      const { error } = await supabase.storage
        .from(EMPLOYEE_DOCUMENTS_BUCKET)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        console.error("[Upload] Supabase upload failed:", error);
        return res.status(500).json({ message: "Failed to upload file" });
      }

      if (oldPath && oldPath !== storagePath) {
        const { error: deleteError } = await supabase.storage
          .from(EMPLOYEE_DOCUMENTS_BUCKET)
          .remove([oldPath]);
        if (deleteError) {
          console.error("[Upload] Failed to remove previous file:", deleteError);
        }
      }

      const { data } = supabase.storage
        .from(EMPLOYEE_DOCUMENTS_BUCKET)
        .getPublicUrl(storagePath);

      return res.status(201).json({
        path: storagePath,
        url: data.publicUrl,
      });
    } catch (error) {
      console.error("[Upload] Failed to upload employee document:", error);
      return res.status(500).json({ message: "Failed to upload employee document" });
    }
  },
);

router.delete("/employee-document", requireAuth, async (req, res) => {
  try {
    const filePath = typeof req.body?.path === "string" ? req.body.path.trim() : "";

    if (!filePath) {
      return res.status(400).json({ message: "File path is required" });
    }

    const { error } = await supabase.storage
      .from(EMPLOYEE_DOCUMENTS_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error("[Upload] Failed to delete employee document:", error);
      return res.status(500).json({ message: "Failed to delete employee document" });
    }

    return res.json({ message: "Document deleted" });
  } catch (error) {
    console.error("[Upload] Failed to delete employee document:", error);
    return res.status(500).json({ message: "Failed to delete employee document" });
  }
});

export default router;
