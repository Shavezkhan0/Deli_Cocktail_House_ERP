import type { AuthUser } from "../middleware/requireAuth";
import type { AuthEmployee } from "../middleware/employeeAuth";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      employee?: AuthEmployee;
    }
  }
}

export {};
