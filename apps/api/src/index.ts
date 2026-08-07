import "dotenv/config";
import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import complainsRouter from "./routes/complains";
import eventsRouter from "./routes/events";
import itemsRouter from "./routes/items";
import usersRouter from "./routes/users";
import warehouseRouter from "./routes/warehouse";
import officeRouter from "./routes/office";
import uploadsRouter from "./routes/uploads";

const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/complains", complainsRouter);
app.use("/api/events", eventsRouter);
app.use("/api/items", itemsRouter);
app.use("/api/users", usersRouter);
app.use("/api/warehouse", warehouseRouter);
app.use("/api/office", officeRouter);
app.use("/api/uploads", uploadsRouter);

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
