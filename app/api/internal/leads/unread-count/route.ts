import { getServerSession } from "@/infrastructure/auth/session";
import { AuthenticatedContext } from "@/infrastructure/tenant/AuthenticatedContext";
import { DashboardRepository } from "@/infrastructure/db/repositories/dashboard.repository";

export async function GET(): Promise<Response> {
  try {
    const session = await getServerSession();

    if (!session) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const authCtx = new AuthenticatedContext(
      session.tenantId,
      session.userId,
      session.role,
    );
    const repository = new DashboardRepository(authCtx);
    const count = await repository.getUnreadLeadsCount();

    return Response.json({ count }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
