# LYCANA — Loup-Garou avec IA

## Contexte
Lycana est une web-app de Loup-Garou où le joueur humain affronte des personnages IA aux personnalités distinctes. Chaque IA bluff, accuse, manipule et se défend avec un style unique.

## Architecture cible
- **Framework** : Next.js 15 (App Router)
- **Styling** : Tailwind CSS
- **LLM** : API Anthropic Claude (Sonnet pour les loups/voyante, Haiku pour les villageois)
- **Auth** : Supabase Auth (Google login) — à ajouter plus tard
- **DB** : Supabase PostgreSQL — à ajouter plus tard
- **Paiement** : Stripe — à ajouter plus tard
- **Déploiement** : Vercel

## Fichiers de référence
- `lycana-prompts-system.md` : Système complet de prompts IA (personnalités, rôles, styles de loup, contextes, filtres)
- `lycana-game-v3.jsx` : Prototype React fonctionnel (game loop complet, à adapter vers Next.js)

## Structure du projet

```
lycana/
├── app/
│   ├── layout.tsx          # Layout global (fonts, metadata)
│   ├── page.tsx            # Page d'accueil / écran de lancement
│   ├── game/
│   │   └── page.tsx        # Page de jeu principale
│   └── api/
│       ├── night/
│       │   └── route.ts    # Actions de nuit (loups, voyante, sorcière)
│       ├── debate/
│       │   └── route.ts    # Génération des répliques IA pendant le débat
│       ├── vote/
│       │   └── route.ts    # Génération des votes IA
│       └── hunter/
│           └── route.ts    # Tir du chasseur
├── lib/
│   ├── prompts.ts          # Tous les prompts (base, personnalités, rôles, styles)
│   ├── game-engine.ts      # State machine du jeu, logique de résolution
│   ├── context-builder.ts  # Construction des contextes IA (game context, vote, nuit)
│   └── anthropic.ts        # Client API Anthropic avec prompt caching
├── components/
│   ├── GameBoard.tsx        # Composant principal du jeu
│   ├── PlayerBar.tsx        # Barre d'avatars des joueurs
│   ├── ChatFeed.tsx         # Flux de messages
│   ├── InputArea.tsx        # Zone de saisie + suggestions
│   ├── VotePanel.tsx        # Interface de vote
│   └── NightOverlay.tsx     # Overlay de nuit
├── types/
│   └── game.ts             # Types TypeScript (Player, Phase, Message, etc.)
├── CLAUDE.md
├── lycana-prompts-system.md
└── lycana-game-v3.jsx
```

## Priorités

### Phase 1 — Migration (priorité immédiate)
1. Initialiser le projet Next.js + Tailwind
2. Migrer les prompts dans `lib/prompts.ts`
3. Migrer la logique de jeu dans `lib/game-engine.ts`
4. Créer les API routes qui appellent Claude côté serveur
5. Adapter le composant React pour utiliser les API routes au lieu d'appeler l'API directement depuis le client
6. Implémenter le prompt caching Anthropic (le system prompt est identique à chaque tour → cachable)

### Phase 2 — Polish
7. Landing page d'accueil
8. Responsive mobile-first
9. Animations de transition jour/nuit

### Phase 3 — Monétisation (plus tard)
10. Supabase Auth
11. Système de crédits
12. Stripe

## Règles techniques
- **Clé API côté serveur uniquement** : la clé Anthropic ne doit JAMAIS être exposée au client. Tous les appels LLM passent par les API routes Next.js.
- **Prompt caching** : utiliser le header `cache_control` d'Anthropic pour cacher le system prompt (personnalité + rôle). Le contexte dynamique (historique du débat) va dans le message user.
- **Streaming** : utiliser le streaming des réponses Anthropic pour que le texte apparaisse progressivement dans le chat (meilleure UX).
- **Pas de localStorage** dans le prototype — tout en React state pour l'instant.
- **TypeScript strict** : types pour Player, Phase, Message, GameState.
- **Variables d'env** : `ANTHROPIC_API_KEY` dans `.env.local`

## Prompt caching Anthropic — Implémentation
```typescript
// Le system prompt est caché car identique à chaque appel pour un même joueur
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 200,
  system: [
    {
      type: "text",
      text: systemPrompt, // personnalité + rôle (stable)
      cache_control: { type: "ephemeral" }
    }
  ],
  messages: [
    { role: "user", content: gameContext } // historique + instructions tour (change)
  ],
});
```

## Style et UX
- Dark theme (dégradés sombres violets/indigo)
- Font display : Cinzel (serif, médiéval)
- Font body : Source Sans 3
- Ambiance atmosphérique : background change selon phase (nuit bleu profond, jour violet, défaite rouge)
- Chat bubbles arrondies, avatar emoji à gauche, messages humain à droite
- Votes révélés un par un avec animation
- Bouton "Passer" pour le joueur humain
- Suggestions contextuelles qui changent selon le tour et les joueurs vivants
