import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentSeller } from "@/lib/current-seller";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/admin/LogoutButton";
import AddSellerForm from "@/components/admin/AddSellerForm";
import SellersTable from "@/components/admin/SellersTable";
import type { Seller } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SellersPage() {
  const currentSeller = await getCurrentSeller();
  if (!currentSeller?.is_admin) {
    redirect("/admin");
  }

  const { data, error } = await supabaseAdmin
    .from("sellers")
    .select("id, name, email, territories, is_admin, created_at")
    .order("created_at", { ascending: true });

  const sellers = (data ?? []) as Seller[];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{currentSeller.name}</span>
            <LogoutButton />
          </div>
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

        <div className="mb-6">
          <SellersTable sellers={sellers} currentSellerId={currentSeller.id} />
        </div>

        <AddSellerForm />
      </div>
    </main>
  );
}
