import { redirect } from "next/navigation";
import { auth } from "@/src/auth";
import { Role } from "@prisma/client";
import AdminDashboard from "@/src/components/AdminDashboard";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== Role.admin) {
    redirect("/admin/login");
  }

  return <AdminDashboard />;
}

