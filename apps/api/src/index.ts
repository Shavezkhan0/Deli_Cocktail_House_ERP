import "dotenv/config";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import complainsRouter from "./routes/complains";
import eventsRouter from "./routes/events";
import itemsRouter from "./routes/items";
import usersRouter from "./routes/users";
import locationsRouter from "./routes/locations";
import designationLocationsRouter from "./routes/designation-locations";
import warehouseRouter from "./routes/warehouse";
import officeRouter from "./routes/office";
import holidaysRouter from "./routes/office/holidays";
import uploadsRouter from "./routes/uploads";
import employeeAuthRouter from "./routes/employee-portal/auth";
import profileRouter from "./routes/employee-portal/profile";
import attendanceRouter from "./routes/employee-portal/attendance";
import salaryRouter from "./routes/employee-portal/salary";
import scoreRouter from "./routes/employee-portal/score";
import employeeEventsRouter from "./routes/employee-portal/events";
import crmEventsRouter from "./routes/employee-portal/crm-events";
import tasksRouter from "./routes/employee-portal/tasks";
import expenseRouter from "./routes/employee-portal/expense";
import vendorRouter from "./routes/employee-portal/vendor";
import travelRouter from "./routes/employee-portal/travel";
import salesRouter from "./routes/employee-portal/sales";
import { employeeAuth } from "./middleware/employeeAuth";

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://13.60.186.249:3000",
      "http://13.60.186.249:3001",
    ],
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/complains", complainsRouter);
app.use("/api/events", eventsRouter);
app.use("/api/items", itemsRouter);
app.use("/api/users", usersRouter);
app.use("/api/locations", locationsRouter);
app.use("/api/designation-locations", designationLocationsRouter);
app.use("/api/warehouse", warehouseRouter);
app.use("/api/office", officeRouter);
app.use("/api/office/holidays", holidaysRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/employee", employeeAuthRouter);
app.use("/api/employee", [
  employeeAuth,
  profileRouter,
  attendanceRouter,
  salaryRouter,
  scoreRouter,
  employeeEventsRouter,
  crmEventsRouter,
  tasksRouter,
  expenseRouter,
  vendorRouter,
  travelRouter,
  salesRouter,
]);

app.get("/", (_req, res) => {
  res.send("Backend is Running");
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT ? Number(process.env.PORT) : 5000;

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
