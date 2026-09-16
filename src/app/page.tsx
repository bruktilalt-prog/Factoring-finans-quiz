import Logo from "@/components/Logo";
import QuizFunnel from "@/components/QuizFunnel";

export default function Home() {
  return (
    <main className="flex flex-1 items-start justify-center px-3 py-6 sm:items-center sm:px-4 sm:py-16">
      <div className="w-full max-w-xl">
        <div className="mb-5 text-center sm:mb-6">
          <Logo />
          <h1 className="mt-3 text-xl font-bold text-slate-900 sm:text-3xl">
            Få et uforpliktende tilbud
          </h1>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8">
          <QuizFunnel />
        </div>
      </div>
    </main>
  );
}
