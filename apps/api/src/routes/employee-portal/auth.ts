import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@repo/database";
import { redis } from "../../lib/redis";
import { sendOtpEmail } from "../../lib/mailer";

const router: Router = Router();

const EMP_OTP_PREFIX = "emp-otp:";
const OTP_TTL_SECONDS = 60 * 5;

const TOKEN_EXPIRES_IN = (process.env.EMPLOYEE_TOKEN_EXPIRES_IN ??
  "1h") as jwt.SignOptions["expiresIn"];

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

router.post("/request-otp", async (req, res) => {
  const { email } = req.body ?? {};

  if (typeof email !== "string" || email.trim().length === 0) {
    return res.status(400).json({ message: "Email is required" });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const employee = await prisma.employee.findUnique({
    where: { email: normalizedEmail },
  });
  if (!employee) {
    return res.status(404).json({ message: "Employee not found" });
  }

  const otp = generateOtp();
  await redis.set(
    `${EMP_OTP_PREFIX}${normalizedEmail}`,
    otp,
    "EX",
    OTP_TTL_SECONDS,
  );

  try {
    await sendOtpEmail(normalizedEmail, otp);
  } catch (error) {
    console.error(`[EMP-OTP] Failed to send email to ${normalizedEmail}:`, error);
    return res.status(500).json({
      message: "Failed to send OTP email. Check the SMTP configuration.",
    });
  }

  return res.status(200).json({
    message: "OTP sent to your email",
    email: normalizedEmail,
  });
});

router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body ?? {};

  if (typeof email !== "string" || typeof otp !== "string") {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const storedOtp = await redis.get(`${EMP_OTP_PREFIX}${normalizedEmail}`);

  if (!storedOtp || storedOtp !== otp) {
    return res.status(401).json({ message: "Invalid or expired OTP" });
  }

  await redis.del(`${EMP_OTP_PREFIX}${normalizedEmail}`);

  const employee = await prisma.employee.findUnique({
    where: { email: normalizedEmail },
  });
  if (!employee) {
    return res.status(404).json({ message: "Employee not found" });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ message: "JWT_SECRET is not configured" });
  }

  const token = jwt.sign(
    {
      employeeId: employee.id,
      designation: employee.designation,
    },
    jwtSecret,
    { expiresIn: TOKEN_EXPIRES_IN },
  );

  return res.status(200).json({
    token,
    employee: {
      id: employee.id,
      name: employee.name,
      designation: employee.designation,
      email: employee.email,
    },
  });
});

router.post("/refresh", async (req, res) => {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ message: "JWT_SECRET is not configured" });
  }

  let employeeId: string;
  try {
    const decoded = jwt.verify(token, jwtSecret, {
      ignoreExpiration: true,
    }) as jwt.JwtPayload;
    if (typeof decoded.employeeId !== "string") {
      return res.status(401).json({ message: "Invalid token" });
    }
    employeeId = decoded.employeeId;
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });
  if (!employee) {
    return res.status(401).json({ message: "Employee not found" });
  }

  const newToken = jwt.sign(
    {
      employeeId: employee.id,
      designation: employee.designation,
    },
    jwtSecret,
    { expiresIn: TOKEN_EXPIRES_IN },
  );

  return res.status(200).json({
    token: newToken,
    employee: {
      id: employee.id,
      name: employee.name,
      designation: employee.designation,
      email: employee.email,
    },
  });
});

export default router;
