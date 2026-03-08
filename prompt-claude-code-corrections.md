# PROMPT À COPIER-COLLER DANS CLAUDE CODE
# ==========================================

Voici toutes les corrections à appliquer. Lis tout avant de commencer, puis fais-les dans l'ordre.

---

## A. CHANGEMENT STRUCTUREL — Tirage au sort des rôles (PRIORITÉ 1)

Dans le code actuel, les rôles sont hardcodés dans PLAYERS_INIT. Il faut les rendre aléatoires.

1. Dans `PLAYERS_INIT` (ou équivalent), retire les propriétés `role` et `wolfStyle` de chaque joueur. Ne garde que les infos fixes : name, emoji, color, isHuman, et ajoute `gender` (voir point C).

2. Crée une fonction `assignRoles(players)` qui :
   - Prend la liste des 8 personnalités
   - Crée un pool : ["Loup-Garou", "Loup-Garou", "Voyante", "Sorcière", "Chasseur", "Villageois", "Villageois", "Villageois"]
   - Shuffle le pool et assigne un rôle aléatoire à chaque joueur
   - Pour les 2 Loups-Garous, assigne un wolfStyle aléatoire ("contributeur" ou "suiveur") à chacun
   - Retourne la liste de joueurs avec rôles assignés

3. Appelle `assignRoles()` au lancement de chaque partie (dans startGame ou équivalent).

4. Le joueur humain peut recevoir N'IMPORTE QUEL rôle.

5. **Adapte l'UI pour chaque rôle humain :**
   - **Villageois** : pas d'action de nuit (comme actuellement)
   - **Voyante** : pendant la nuit, affiche une interface "Qui veux-tu inspecter ?" avec les joueurs vivants. Affiche le rôle exact du joueur inspecté (ex: "Loup-Garou", "Sorcière", "Villageois", "Chasseur" — pas juste "Innocent")
   - **Loup-Garou** : pendant la nuit, affiche "Qui dévorer ?" avec les villageois vivants. Montre qui est l'autre Loup
   - **Sorcière** : pendant la nuit, affiche "Les loups ciblent [nom]. Utiliser la potion de guérison ? / Empoisonner quelqu'un ? / Ne rien faire"
   - **Chasseur** : s'il meurt (nuit ou vote), affiche "Tu es mort ! Qui emportes-tu ?" avec les joueurs vivants
   - Pour tous : affiche le rôle dans la barre de statut

6. **Important** : le joueur humain s'appelle "Thibault" dans le prototype actuel, mais ce nom sera dynamique plus tard (saisi par l'utilisateur ou récupéré de son compte). Ne hardcode JAMAIS "Thibault" dans la logique de jeu. Utilise toujours `player.isHuman` pour identifier le joueur humain, jamais une comparaison sur le nom.

6. **Principe architectural** : la personnalité (Couche 1 = comment le personnage parle) est FIXE et liée au nom. Le rôle (Couche 2 = stratégie secrète) est ALÉATOIRE. Le system prompt est assemblé dynamiquement : personnalité fixe + rôle aléatoire.

---

## B. PROMPTS — Permettre aux IA de parler moins (PRIORITÉ 2)

1. Dans `prompts.ts`, dans le BASE_PROMPT, section FORMAT, ajoute :
```
Tu n'es PAS obligé de faire une longue intervention à chaque tour. Si tu n'as rien de pertinent à ajouter, tu peux dire "Rien à ajouter", "Je passe", "J'observe", ou simplement acquiescer en une phrase. Ne parle PAS pour meubler — parle uniquement si tu as quelque chose d'utile : un soupçon, une défense, une question, une réaction concrète. Le silence est une option valide.
```

2. Dans `context-builder.ts`, dans les instructions de Tour 1 (Couche 3), ajoute :
```
Si tu n'as aucun soupçon ni rien de concret à dire, une intervention courte ("Je préfère observer pour l'instant") est parfaitement acceptable.
```

---

## C. PROMPTS — Corrections de règles et de format (PRIORITÉ 3)

### C1. Règle loups obligatoire
Dans le BASE_PROMPT, ajoute dans la section RÈGLES :
```
RÈGLE IMPORTANTE : Les Loups DOIVENT tuer quelqu'un chaque nuit, c'est obligatoire. S'il n'y a pas de mort la nuit, c'est UNIQUEMENT parce que la Sorcière a utilisé sa potion de guérison. Ne dis JAMAIS que les loups peuvent "choisir de ne pas tuer".
```

### C2. Sorcière poison
Dans le prompt du rôle Sorcière dans `prompts.ts`, ajoute :
```
POISON : N'empoisonne JAMAIS au hasard. Utilise le poison UNIQUEMENT sur quelqu'un que tu soupçonnes FORTEMENT d'être Loup-Garou, basé sur le débat. En cas de doute, ne fais RIEN.
```

### C3. Genres des personnages
Dans chaque personnalité dans `prompts.ts`, ajoute le genre après le nom :
- Victor (il/lui)
- Marguerite (elle)
- Camille (elle)
- Hugo (il)
- Basile (il)
- Roxane (elle)
- Lucie (elle)
- Thibault (il)

Et dans le BASE_PROMPT ajoute :
```
Utilise le bon genre (il/elle) quand tu parles des autres joueurs.
```

### C4. Rappel d'identité dans le contexte dynamique
Dans `context-builder.ts`, dans CHAQUE fonction de contexte (débat, vote, nuit), ajoute en première ligne du contexte dynamique :
```
RAPPEL : Tu es {nom_du_joueur}. Ne parle JAMAIS de toi à la 3ème personne. Ne vote JAMAIS pour toi-même. Ne commence JAMAIS ta réplique par ton propre nom.
```

### C5. Anti-didascalies renforcé
Dans le BASE_PROMPT, reformule la règle existante pour :
```
Commence DIRECTEMENT par ce que tu DIS. Jamais par ton nom, jamais par une description de ce que tu fais. Pas de "Je me tourne vers...", "Je prends une seconde...", "Je fronce les sourcils...". Tu PARLES, point.
```

Et dans `anthropic.ts` (ou là où les réponses IA sont nettoyées), ajoute un filtre post-génération qui :
- Supprime toute ligne commençant par le nom du joueur + ":" (ex: "Roxane:" en début de réponse)
- Supprime les phrases commençant par "Je me tourne", "Je prends", "Je fronce", "Je regarde", "Je lève", "Je secoue"

### C6. Anti-hallucination
Dans `context-builder.ts`, quand cycle === 1, ajoute dans le contexte :
```
C'est le PREMIER cycle. Il n'y a eu AUCUN vote ni événement avant cette nuit. Ne fais JAMAIS référence à des événements qui ne figurent pas dans l'historique ci-dessus.
```

---

## D. BUGS D'AFFICHAGE (PRIORITÉ 4)

### D1. Pluriel narration aube
Dans le code qui génère le message d'aube quand il y a plusieurs morts, change la logique :
- Si 1 mort : "{nom} (rôle) ne verra plus le soleil."
- Si 2+ morts : "{nom1} (rôle1) et {nom2} (rôle2) ne verront plus le soleil."

### D2. Rôles tronqués
Cherche `.slice(0,8)` ou tout truncate sur les noms de rôles dans les composants d'affichage (game over, révélation). Remplace par le rôle complet. Si problème de largeur, utilise :
- "Loup-Garou" → "🐺 Loup"
- "Villageois" → "Villageois"
- "Chasseur" → "Chasseur"
- "Voyante" → "Voyante"
- "Sorcière" → "Sorcière"

---

## E. DEBUG (PRIORITÉ 5)

### E1. Log Voyante
Ajoute un console.log dans la route night qui affiche :
- Qui la Voyante inspecte
- Le rôle exact du joueur inspecté (pas juste "Loup/Innocent")
- L'historique complet des inspections

**Important** : la Voyante (IA ou humaine) voit le RÔLE EXACT du joueur inspecté : "Loup-Garou", "Villageois", "Sorcière", "Chasseur". Pas juste "Loup/Innocent". C'est un choix de game design — ça rend le rôle de Voyante plus stratégique (savoir que quelqu'un est Chasseur est une info utile pour le village).

Mets à jour :
- Le résultat d'inspection dans la route night (retourne le rôle exact)
- Le contexte de la Voyante IA dans `context-builder.ts` (ses infos privées montrent le rôle exact : "Cycle 1 : Hugo est Loup-Garou", "Cycle 2 : Roxane est Sorcière")
- L'UI d'inspection pour le joueur humain Voyante (affiche le rôle exact)
- Le prompt du rôle Voyante dans `prompts.ts` : remplace les références à "camp" par "rôle" ("Tu découvres le RÔLE exact d'un joueur chaque nuit")

---

RAPPEL : la personnalité (Couche 1) ne contient AUCUNE instruction stratégique. Le rôle (Couche 2) ne contient AUCUNE instruction de timing. Les instructions de tour (Couche 3) sont dans le contexte dynamique et s'appliquent à TOUS les joueurs.
