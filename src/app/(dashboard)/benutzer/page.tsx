import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { UserTable } from "@/components/users/user-table";

async function getUsers() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        companyUsers: {
          select: {
            company: { select: { id: true, name: true } },
            role: true,
          },
        },
      },
    });
    return users;
  } catch {
    return [];
  }
}

export default async function BenutzerPage() {
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Benutzer</h1>
          <p className="text-muted-foreground">
            {users.length} {users.length === 1 ? "Benutzer" : "Benutzer"}{" "}
            insgesamt
          </p>
        </div>
        <Button asChild>
          <Link href="/benutzer/neu">
            <Plus className="mr-2 h-4 w-4" />
            Neuer Benutzer
          </Link>
        </Button>
      </div>

      <UserTable data={JSON.parse(JSON.stringify(users))} />
    </div>
  );
}
