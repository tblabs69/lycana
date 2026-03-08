import Link from "next/link";

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center text-white px-6"
      style={{ background: "linear-gradient(170deg,#0f0a1a,#1a0f2e,#1e1232)" }}
    >
      <div className="max-w-sm text-center">
        <div className="text-7xl mb-6">🌕</div>
        <h1
          className="font-display text-3xl sm:text-4xl tracking-widest mb-3"
          style={{ color: "#d4a843" }}
        >
          LYCANA
        </h1>
        <p className="text-gray-400 text-sm mb-1">
          Loup-Garou propulsé par l&apos;IA
        </p>
        <p className="text-gray-600 text-xs mb-8">
          8 à 15 joueurs. Bluff, déduction, survie.
        </p>
        <Link
          href="/game"
          className="inline-block px-10 py-3.5 rounded-xl font-display text-sm tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-yellow-900/20"
          style={{
            background: "linear-gradient(135deg,#d4a843,#b8892e)",
            color: "#1a0f2e",
          }}
        >
          JOUER
        </Link>
      </div>
    </main>
  );
}
