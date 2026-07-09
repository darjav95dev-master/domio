import { requireAuth } from "@/infrastructure/auth/require-auth";
import { DashboardRepository } from "@/infrastructure/db/repositories/dashboard.repository";

export async function GET(): Promise<Response> {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return auth.response;
    const repository = new DashboardRepository(auth.ctx);
    const count = await repository.getUnreadLeadsCount();

    return Response.json({ count }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
