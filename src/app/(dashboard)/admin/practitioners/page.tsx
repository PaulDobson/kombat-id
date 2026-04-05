import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { DrizzlePractitionerRepository } from "@/modules/practitioner-identity/infrastructure/repositories/drizzlePractitionerRepository";
import type { Grade } from "@/modules/practitioner-identity/domain/entities/practitioner";
import Link from "next/link";

async function requireAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await adminSupabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) redirect("/");
  return user;
}

export default async function AdminPractitionersPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; rut?: string; grade?: string }>;
}) {
  await requireAdminUser();
  const params = await searchParams;
  const repo = new DrizzlePractitionerRepository();
  const practitioners = await repo.search({
    ...(params.name ? { name: params.name } : {}),
    ...(params.rut ? { rut: params.rut } : {}),
    ...(params.grade ? { grade: params.grade as Grade } : {}),
  });

  return (
    <main>
      <h1>Practicantes</h1>
      <Link href="/admin/practitioners/new">Registrar nuevo</Link>

      <form method="GET">
        <input name="name" defaultValue={params.name} placeholder="Nombre" />
        <input name="rut" defaultValue={params.rut} placeholder="RUT" />
        <input name="grade" defaultValue={params.grade} placeholder="Grado" />
        <button type="submit">Buscar</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>RUT</th>
            <th>Grado</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {practitioners.map((p) => (
            <tr key={p.id}>
              <td>{p.fullName}</td>
              <td>{p.rut}</td>
              <td>
                {p.grade}
                {p.dan ? ` ${p.dan}° Dan` : ""}
              </td>
              <td>{p.isActive ? "Activo" : "Inactivo"}</td>
              <td>
                <Link href={`/admin/practitioners/${p.id}`}>Ver</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {practitioners.length === 0 && <p>No se encontraron practicantes.</p>}
    </main>
  );
}
