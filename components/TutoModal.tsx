"use client";

import { useEffect, useRef } from "react";

interface TutoModalProps {
  open: boolean;
  onClose: () => void;
}

export default function TutoModal({ open, onClose }: TutoModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-start justify-center animate-fade-in"
      style={{ backgroundColor: "rgba(5, 3, 15, 0.92)", backdropFilter: "blur(8px)" }}
    >
      <div className="relative w-full max-w-2xl mx-4 my-6 sm:my-10 max-h-[calc(100vh-3rem)] sm:max-h-[calc(100vh-5rem)] overflow-y-auto rounded-2xl border border-white/8 bg-[#0f0a1a]/95 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="fixed top-4 right-4 sm:absolute sm:top-4 sm:right-4 z-10 w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Fermer"
        >
          ✕
        </button>

        <div className="px-5 sm:px-8 py-6 sm:py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🐺</div>
            <h2 className="font-display text-2xl tracking-widest" style={{ color: "#d4a843" }}>
              Comment jouer
            </h2>
          </div>

          {/* ── Le principe ── */}
          <Section title="Le principe">
            <P>Lycana, c&apos;est un village où tout le monde se connaît. Sauf que la nuit, des loups-garous dévorent un habitant. Le matin, le village se réveille avec un mort de plus et pas l&apos;ombre d&apos;un indice.</P>
            <P>Ton job : comprendre qui ment, qui dit vrai, et voter pour éliminer les loups avant qu&apos;ils ne vous bouffent tous.</P>
            <P>Tu joues avec des personnages pilotés par l&apos;IA. Ils ont des personnalités, des stratégies, et surtout — ils mentent très bien.</P>
          </Section>

          {/* ── Comment ça se passe ── */}
          <Section title="Comment ça se passe">
            <P>Chaque partie alterne entre la nuit et le jour.</P>
            <P><strong className="text-white">La nuit</strong>, tu dors (sauf si tu as un rôle spécial). Les loups choisissent une victime. La Voyante inspecte quelqu&apos;un. La Sorcière décide si elle utilise ses potions. Tout ça se passe automatiquement si tu es simple villageois — tu vois juste une animation et tu attends le verdict.</P>
            <P>Si tu ES Voyante, Loup, Sorcière ou autre rôle actif la nuit, c&apos;est toi qui fais les choix.</P>
            <P><strong className="text-white">Le jour</strong>, on découvre qui est mort. Et là, ça commence : deux tours de débat où chacun parle à tour de rôle. Tu peux accuser, défendre, questionner, bluffer, ou juste observer. Après les deux tours, tout le monde vote pour éliminer un suspect. Celui qui a le plus de voix est éliminé et son rôle est révélé.</P>
            <P>Puis la nuit retombe. Et ça recommence.</P>
          </Section>

          {/* ── Qui gagne ? ── */}
          <Section title="Qui gagne ?">
            <P>Deux camps, un seul objectif chacun.</P>
            <P><strong className="text-white">Le village</strong> gagne quand tous les loups sont éliminés. Peu importe combien de villageois sont morts en route.</P>
            <P><strong className="text-white">Les loups</strong> gagnent quand ils sont aussi nombreux que les villageois restants. À ce moment-là, le village ne peut plus voter contre eux — c&apos;est fini.</P>
            <P>Si le Cupidon est dans la partie, un troisième camp peut exister : le couple amoureux. Si un loup et un villageois sont amoureux, ils doivent éliminer absolument tout le monde pour vivre leur histoire. Romantique et brutal.</P>
          </Section>

          {/* ── Les rôles ── */}
          <Section title="Les rôles">
            <h4 className="font-display text-sm tracking-wider text-gray-400 uppercase mb-3">Camp du village</h4>

            <RoleBlock emoji="👤" name="Villageois">
              Pas de pouvoir, mais c&apos;est le rôle le plus important. Tu observes, tu argumentes, tu votes. Les loups sous-estiment toujours les villageois silencieux qui réfléchissent.
            </RoleBlock>
            <RoleBlock emoji="🔮" name="Voyante">
              Chaque nuit, tu découvres le rôle d&apos;un joueur. C&apos;est une info en or, mais si les loups devinent que tu es la Voyante, tu es morte la nuit suivante. Tout l&apos;enjeu : orienter le village sans te griller.
            </RoleBlock>
            <RoleBlock emoji="🧪" name="Sorcière">
              Tu as deux potions, une seule utilisation chacune. La potion de guérison sauve la victime des loups. Le poison tue quelqu&apos;un de ton choix. Utilise-les au bon moment — gaspiller une potion sur un mauvais timing, ça peut coûter la partie.
            </RoleBlock>
            <RoleBlock emoji="🎯" name="Chasseur">
              Si tu meurs (la nuit ou au vote), tu emportes quelqu&apos;un avec toi. Les loups hésitent à te tuer parce que tu peux les descendre en mourant. Tu peux même menacer de te révéler pour te protéger du vote.
            </RoleBlock>
            <RoleBlock emoji="💘" name="Cupidon">
              La première nuit, tu choisis deux joueurs qui deviennent amoureux. Si l&apos;un meurt, l&apos;autre meurt aussi. Après ça, tu es un villageois normal — mais tu sais qui forme le couple.
            </RoleBlock>
            <RoleBlock emoji="🛡️" name="Ancien">
              Tu résistes à la première attaque des loups. Mais attention : si le village te vote, tous les rôles spéciaux perdent leurs pouvoirs. C&apos;est ta meilleure arme et ton pire cauchemar.
            </RoleBlock>
            <RoleBlock emoji="🔒" name="Salvateur">
              Chaque nuit, tu protèges un joueur de l&apos;attaque des loups. Tu ne peux pas protéger la même personne deux nuits de suite.
            </RoleBlock>
            <RoleBlock emoji="🐦" name="Corbeau">
              Chaque nuit, tu désignes quelqu&apos;un qui commencera le vote du lendemain avec 2 voix contre lui. Personne ne sait qui est le Corbeau. C&apos;est un outil de pression redoutable.
            </RoleBlock>
            <RoleBlock emoji="👧" name="Petite Fille">
              Tu espionnes les loups la nuit. Tu as une chance sur deux de voir l&apos;un d&apos;eux, mais une chance sur cinq de te faire repérer. Si ça arrive, tu meurs sur le coup.
            </RoleBlock>
            <RoleBlock emoji="🤪" name="Idiot du Village">
              Si le village vote pour t&apos;éliminer, tu survis. Par contre, tu perds ton droit de vote pour le reste de la partie. Un bouclier à usage unique.
            </RoleBlock>

            <h4 className="font-display text-sm tracking-wider text-gray-400 uppercase mt-6 mb-3">Camp des loups</h4>

            <RoleBlock emoji="🐺" name="Loup-Garou">
              Chaque nuit, vous choisissez ensemble une victime. Le jour, vous faites semblant d&apos;être des villageois innocents. Tout l&apos;art est dans le bluff : accuser les bons, défendre les loups sans que ça se voie, et ne jamais se contredire.
            </RoleBlock>
            <RoleBlock emoji="🐺👑" name="Loup Alpha">
              Un loup avec un pouvoir spécial : une fois par partie, au lieu de tuer quelqu&apos;un, tu peux le convertir en loup. Convertir la Voyante, ça change toute la partie.
            </RoleBlock>
          </Section>

          {/* ── Conseils ── */}
          <Section title="Conseils pour bien jouer" noBorder>
            <P><strong className="text-white">Si tu es villageois</strong> : écoute plus que tu parles au premier tour. Regarde qui accuse qui, et surtout avec quels arguments. Des accusations vagues et sans fondement, c&apos;est souvent un loup qui essaie de faire éliminer un innocent.</P>
            <P><strong className="text-white">Si tu es loup</strong> : ne défends jamais ton coéquipier trop ouvertement. Le meilleur move, c&apos;est parfois de voter contre lui quand le village est déjà convaincu. Tu gagnes en crédibilité et tu survis un tour de plus.</P>
            <P><strong className="text-white">Si tu es Voyante</strong> : ne dis pas que tu es la Voyante. Oriente le débat avec des arguments comportementaux (&ldquo;je trouve Hugo bizarre depuis le début&rdquo;) plutôt que de révéler ta source. Garde la révélation pour le moment critique.</P>
            <P><strong className="text-white">Si tu es Chasseur</strong> : menace. &ldquo;Votez-moi si vous voulez, mais celui qui part avec moi va le regretter.&rdquo; Ça suffit souvent à détourner le vote.</P>
            <P><strong className="text-yellow-400">Un vote unanime, c&apos;est suspect.</strong> Si tout le monde accuse la même personne, demande-toi pourquoi. Les loups adorent se planquer dans un vote de foule.</P>
          </Section>

          {/* Bottom CTA */}
          <div className="text-center mt-8 pb-2">
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-xl font-display text-sm tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-yellow-900/20"
              style={{ background: "linear-gradient(135deg,#d4a843,#b8892e)", color: "#1a0f2e" }}
            >
              COMPRIS !
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, noBorder }: { title: string; children: React.ReactNode; noBorder?: boolean }) {
  return (
    <div className={`mb-6 pb-6 ${noBorder ? "" : "border-b border-white/10"}`}>
      <h3 className="font-display text-lg tracking-wider mb-4" style={{ color: "#d4a843" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-300 text-sm leading-relaxed mb-3">{children}</p>;
}

function RoleBlock({ emoji, name, children }: { emoji: string; name: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 pl-1">
      <p className="text-gray-300 text-sm leading-relaxed">
        <span className="text-base mr-1.5">{emoji}</span>
        <strong className="text-white">{name}</strong>
        {" — "}
        {children}
      </p>
    </div>
  );
}
