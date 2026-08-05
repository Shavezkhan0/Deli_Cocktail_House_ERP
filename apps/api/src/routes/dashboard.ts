import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";

const router: Router = Router();

type UpcomingEvent = {
  id: string;
  name: string;
  date: string;
  venue: string;
  guests: number;
  status: "CONFIRMED" | "PENDING" | "COMPLETED";
};

const upcomingEvents: UpcomingEvent[] = [
  {
    id: "evt_001",
    name: "Corporate Gala Night",
    date: "2026-08-15T18:00:00Z",
    venue: "Grand Ballroom",
    guests: 350,
    status: "CONFIRMED",
  },
  {
    id: "evt_002",
    name: "Wedding Reception - Ali & Sara",
    date: "2026-08-18T17:30:00Z",
    venue: "Riverside Garden",
    guests: 500,
    status: "CONFIRMED",
  },
  {
    id: "evt_003",
    name: "Birthday Bash - Amina",
    date: "2026-08-22T19:00:00Z",
    venue: "Skyline Terrace",
    guests: 120,
    status: "PENDING",
  },
  {
    id: "evt_004",
    name: "Team Offsite Lunch",
    date: "2026-08-25T12:00:00Z",
    venue: "In-House Dining",
    guests: 45,
    status: "CONFIRMED",
  },
  {
    id: "evt_005",
    name: "Product Launch Party",
    date: "2026-09-02T18:30:00Z",
    venue: "Harbour View Hall",
    guests: 280,
    status: "PENDING",
  },
];

router.get("/overview", requireAuth, (_req, res) => {
  res.json({
    runningEvents: 3,
    pendingApprovals: 5,
    lowStockItems: 7,
    employeesPresent: 24,
    upcomingEvents,
  });
});

export default router;
