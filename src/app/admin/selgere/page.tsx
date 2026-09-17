import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/admin/LogoutButton";
import AddSellerForm from "@/components/admin/AddSellerForm";
import type { Seller } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SellersPage() {
  const { data, error } = await supabaseAdmin
    .from("sellers")
    .select("*")
    .order("created_at", { ascending: true });

  const sellers = (data ?? []) as Seller[];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <LogoutButton />
        </div>

        <Link href="/admin" className="text-sm font-medium text-slate-500 hover:text-slate-700">
          ← Alle leads
        </Link>
        <h1 className="mt-2 mb-6 text-2xl font-bold text-slate-900">Selgere</h1>

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            Feil ved henting: {error.message}
          </p>
        )}

        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Navn</th>
                <th className="px-4 py-3 font-medium">E-post</th>
                <th className="px-4 py-3 font-medium">Områder</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map((seller) => (
                <tr key={seller.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{seller.name}</td>
                  <td className="px-4 py-3 text-slate-600">{seller.email}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {seller.territories.length > 0 ? seller.territories.join(", ") : "—"}
                  </td>
                </tr>
              ))}
              {sellers.length === 0 && !error && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                    Ingen selgere lagt til ennå.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <AddSellerForm />
      </div>
    </main>
  );
}
