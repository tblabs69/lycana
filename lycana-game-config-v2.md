# LYCANA — Système de Configuration des Parties
# Version 2.0

## 1. PRINCIPE

Avant chaque partie, le joueur choisit :
1. Le nombre de joueurs (8 à 15)
2. Les rôles spéciaux qu'il veut inclure (parmi un catalogue)
3. Le nombre de loups est calculé automatiquement

Les personnalités IA sont piochées aléatoirement dans un pool. Les rôles sont assignés aléatoirement aux personnalités. Le joueur humain peut tomber sur n'importe quel rôle.

---

## 2. RÈGLE D'ÉQUILIBRAGE

Source : communauté Thiercelieux expert + guide Steam Agrou

- **Loups** : ~1/4 des joueurs (arrondi inférieur)
  - 8-10 joueurs → 2 Loups
  - 11-14 joueurs → 3 Loups
  - 15 joueurs → 3 ou 4 Loups (choix du joueur)

- **Rôles spéciaux village** : ~1/3 des non-loups
  - 8 joueurs → 2-3 rôles spéciaux
  - 10 joueurs → 3-4 rôles spéciaux
  - 12 joueurs → 4-5 rôles spéciaux
  - 15 joueurs → 5-6 rôles spéciaux

- **Villageois simples** : le reste

---

## 3. CATALOGUE DES RÔLES

### 3.1 Rôles de base (toujours disponibles)

#### LOUP-GAROU 🐺
- Camp : Loups
- Pouvoir : chaque nuit, les loups choisissent ensemble une victime
- Se connaissent entre eux
- Nombre : 2-4 selon la taille de la partie

#### VILLAGEOIS 👤
- Camp : Village
- Pouvoir : aucun. Observation et argumentation.
- Le rôle le plus courant et le plus important

#### VOYANTE 🔮
- Camp : Village
- Pouvoir : chaque nuit, découvre le rôle exact d'un joueur
- Doit protéger son identité
- Recommandé : TOUJOURS inclure. Essentiel à l'équilibre.

#### SORCIÈRE 🧪
- Camp : Village
- Pouvoir : 2 potions à usage unique — guérison (sauve la victime des loups) et poison (tue un joueur). Nuits différentes.
- Sait qui les loups ciblent chaque nuit
- Recommandé : TOUJOURS inclure pour 8+ joueurs.

#### CHASSEUR 🎯
- Camp : Village
- Pouvoir : s'il meurt (nuit ou vote), il désigne un joueur qui meurt avec lui
- Effet dissuasif naturel
- Recommandé : inclure dès 8 joueurs.

### 3.2 Rôles additionnels (débloqués selon la taille ou par choix)

#### CUPIDON 💘
- Camp : Village (mais peut créer un couple mixte)
- Pouvoir : la première nuit, désigne 2 joueurs amoureux. Si l'un meurt, l'autre meurt aussi.
- Twist : si un Amoureux est Loup et l'autre Village, ils doivent éliminer TOUT LE MONDE pour gagner ensemble (3ème camp)
- Disponible dès 10 joueurs
- Impact sur le jeu : FORT (crée un 3ème camp potentiel)

#### ANCIEN 🛡️
- Camp : Village
- Pouvoir : résiste à la première attaque des loups (survit une nuit). Mais s'il est éliminé par le vote du village, tous les rôles spéciaux village perdent leurs pouvoirs.
- Disponible dès 10 joueurs
- Impact : MOYEN (protège le village mais punition si mal éliminé)

#### SALVATEUR (GARDE) 🔒
- Camp : Village
- Pouvoir : chaque nuit, protège un joueur de l'attaque des loups. Ne peut pas protéger le même joueur 2 nuits de suite. Peut se protéger lui-même.
- Disponible dès 10 joueurs
- Impact : MOYEN (complémentaire à la Sorcière)

#### PETITE FILLE 👧
- Camp : Village
- Pouvoir : peut espionner les loups pendant la nuit (entrouvre les yeux). Si elle se fait repérer, elle meurt.
- ATTENTION : ce rôle est controversé (trop puissant si elle voit tous les loups d'un coup). Dans Lycana version IA, on l'adapte : chaque nuit, elle a 50% de chance de voir UN des loups, et 20% de chance d'être repérée et tuée.
- Disponible dès 12 joueurs
- Impact : TRÈS FORT (à utiliser avec précaution)

#### CORBEAU 🐦
- Camp : Village
- Pouvoir : chaque nuit, désigne un joueur qui commencera le vote du lendemain avec 2 votes contre lui. Crée de la pression.
- Disponible dès 10 joueurs
- Impact : MOYEN (oriente le débat)

#### LOUP ALPHA 🐺👑
- Camp : Loups
- Pouvoir : une fois par partie, peut transformer un villageois en loup-garou au lieu de le dévorer. Le villageois devient loup et le sait.
- Remplace un des Loups-Garous standard
- Disponible dès 12 joueurs
- Impact : TRÈS FORT (change l'équilibre en cours de partie)

#### IDIOT DU VILLAGE 🤪
- Camp : Village
- Pouvoir : s'il est voté pour être éliminé, il révèle son rôle et reste en vie mais perd son droit de vote. Immunisé au premier vote.
- Disponible dès 10 joueurs
- Impact : FAIBLE (fun, crée de la surprise)

---

## 4. COMPOSITIONS RECOMMANDÉES (presets)

Le joueur peut choisir un preset ou personnaliser.

### CLASSIQUE (8 joueurs) — le MVP actuel
| Rôle | Nombre |
|------|--------|
| Loup-Garou | 2 |
| Voyante | 1 |
| Sorcière | 1 |
| Chasseur | 1 |
| Villageois | 3 |

### ÉTENDU (10 joueurs)
| Rôle | Nombre |
|------|--------|
| Loup-Garou | 2 |
| Voyante | 1 |
| Sorcière | 1 |
| Chasseur | 1 |
| Cupidon | 1 |
| Ancien | 1 |
| Villageois | 3 |

### INTENSE (12 joueurs)
| Rôle | Nombre |
|------|--------|
| Loup-Garou | 3 |
| Voyante | 1 |
| Sorcière | 1 |
| Chasseur | 1 |
| Cupidon | 1 |
| Salvateur | 1 |
| Corbeau | 1 |
| Villageois | 3 |

### CHAOS (15 joueurs)
| Rôle | Nombre |
|------|--------|
| Loup-Garou | 2 |
| Loup Alpha | 1 |
| Voyante | 1 |
| Sorcière | 1 |
| Chasseur | 1 |
| Cupidon | 1 |
| Salvateur | 1 |
| Ancien | 1 |
| Petite Fille | 1 |
| Corbeau | 1 |
| Idiot du Village | 1 |
| Villageois | 3 |

---

## 5. ÉCRAN DE CONFIGURATION (UI)

### Étape 1 : Nombre de joueurs
Slider ou boutons : 8 — 9 — 10 — 11 — 12 — 13 — 14 — 15
Sous le slider : "{N} joueurs dont {L} loups"
Le nombre de loups s'ajuste automatiquement (2 pour 8-10, 3 pour 11-14, 3-4 pour 15)

### Étape 2 : Choix des rôles
Affiche les rôles disponibles sous forme de cartes à activer/désactiver.

**Toujours actifs (grisés, non désactivables) :**
- Loup-Garou (×2 ou ×3)
- Villageois (×N, s'ajuste automatiquement)

**Actifs par défaut (désactivables) :**
- Voyante ✓
- Sorcière ✓
- Chasseur ✓

**Optionnels (activables) :**
- Cupidon (dès 10 joueurs)
- Ancien (dès 10 joueurs)
- Salvateur (dès 10 joueurs)
- Corbeau (dès 10 joueurs)
- Petite Fille (dès 12 joueurs)
- Loup Alpha (dès 12 joueurs, remplace 1 Loup standard)
- Idiot du Village (dès 10 joueurs)

**Compteur en temps réel :**
"Loups : 3 | Spéciaux : 4 | Villageois : 5 | Total : 12 ✓"
Si le joueur ajoute trop de spéciaux (plus de villageois simples restants < 2), message d'avertissement :
"⚠️ Trop de rôles spéciaux — ajoute des joueurs ou retire un rôle"

### Étape 3 : Presets rapides
3 boutons en haut : "Classique" / "Étendu" / "Chaos"
Qui pré-remplissent tout.
+ bouton "Personnaliser" qui ouvre l'étape 2 en mode édition.

### Étape 4 : Lancer
Bouton "PREMIÈRE NUIT" → la partie commence avec la config choisie.

---

## 6. POOL DE PERSONNALITÉS IA

Actuellement 7 personnalités IA + 1 humain = 8 joueurs.
Pour supporter 15 joueurs, il faut 14 personnalités IA.

### Personnalités existantes (7) :
1. Victor — Le Paranoïaque 🔥
2. Marguerite — La Diplomate 🌸
3. Camille — La Stratège 🔮
4. Hugo — Le Social 🌿
5. Basile — Le Taiseux 🪨
6. Roxane — L'Accusatrice ⚔️
7. Lucie — L'Imprévisible 🌙

### Nouvelles personnalités (7 à créer) :
8. **Armand** — Le Vétéran 🎖️ (il, 60 ans, expérimenté, cite les parties précédentes comme référence, ton de vieux sage agacé)
9. **Noémie** — La Comédienne 🎭 (elle, 30 ans, joue un personnage dans le personnage, théâtrale, dramatise tout)
10. **Sacha** — Le Froid 🧊 (il, 35 ans, zéro émotion, analyse pure, parle comme un chirurgien, jamais d'opinion "sentie")
11. **Élise** — La Protectrice 🫶 (elle, 40 ans, maternelle, défend les plus faibles, s'énerve si on s'acharne sur quelqu'un)
12. **Théo** — Le Provocateur 😈 (il, 25 ans, troll bienveillant, lance des piques, teste les réactions, cherche à déstabiliser)
13. **Inès** — La Suspecte 🕶️ (elle, 30 ans, mystérieuse, donne peu d'infos sur elle, retourne les questions, toujours évasive)
14. **Gabriel** — Le Suiveur 📎 (il, 20 ans, indécis, se range derrière les leaders, dit souvent "je suis d'accord avec...", facile à manipuler)

---

## 7. PROMPTS DES NOUVEAUX RÔLES

### CUPIDON
```
RÔLE SECRET : Cupidon. La première nuit, tu désignes 2 joueurs qui deviennent Amoureux. Si l'un meurt, l'autre meurt aussi.
TWIST : si un Amoureux est Loup et l'autre Village, ils forment un 3ème camp — ils doivent éliminer tout le monde.
Après la première nuit, tu es un simple villageois. Mais tu SAIS qui sont les Amoureux. Utilise cette info subtilement — si un des Amoureux est en danger, tu peux le défendre sans révéler pourquoi.
```

### ANCIEN
```
RÔLE SECRET : Ancien. Tu résistes à la première attaque des loups — tu survis UNE nuit de plus.
ATTENTION : si le VILLAGE te vote pour t'éliminer (pas les loups), TOUS les rôles spéciaux village perdent leurs pouvoirs (Voyante, Sorcière, Chasseur...).
Tu peux utiliser cette info comme menace : "Si vous me votez et que je suis l'Ancien, vous perdez tout."
C'est un claim risqué mais puissant — un Loup peut aussi prétendre être l'Ancien.
```

### SALVATEUR (GARDE)
```
RÔLE SECRET : Salvateur. Chaque nuit, tu protèges UN joueur de l'attaque des loups.
CONTRAINTE : tu ne peux PAS protéger le même joueur 2 nuits de suite. Tu PEUX te protéger toi-même.
Protège ton identité — si les loups savent qui tu es, ils t'élimineront.
Stratégie : protège les joueurs que tu suspectes d'être Voyante ou Sorcière.
```

### PETITE FILLE
```
RÔLE SECRET : Petite Fille. Chaque nuit, tu espionnes les loups.
Tu as 50% de chance de voir le nom d'UN des loups. Mais tu as 20% de chance d'être repérée et tuée immédiatement.
C'est un rôle très risqué mais très puissant. Si tu survis avec des infos, utilise-les prudemment — révéler trop tôt te condamne.
```

### CORBEAU
```
RÔLE SECRET : Corbeau. Chaque nuit, tu désignes un joueur qui commencera le vote du lendemain avec 2 voix contre lui.
C'est un outil de pression — tu peux cibler un suspect pour forcer le débat sur lui, ou cibler un innocent pour tester les réactions.
Les joueurs ne savent pas QUI est le Corbeau. Ils voient juste "X commence avec 2 voix".
```

### LOUP ALPHA
```
RÔLE SECRET : Loup Alpha. Tu es un Loup-Garou avec un pouvoir spécial.
UNE FOIS par partie, au lieu de tuer un villageois, tu peux le CONVERTIR en Loup-Garou. Il le sait et rejoint votre camp.
Utilise ce pouvoir au moment stratégique — convertir la Voyante ou la Sorcière est dévastateur.
Ce pouvoir remplace l'attaque normale cette nuit-là (pas de mort, pas de conversion + mort).
```

### IDIOT DU VILLAGE
```
RÔLE SECRET : Idiot du Village. Si tu es voté pour être éliminé, tu révèles ton rôle et tu SURVIS.
Mais tu perds ton droit de vote pour le reste de la partie. Tu peux encore parler et débattre.
C'est un bouclier unique — les loups hésiteront à te cibler car c'est un vote "gaspillé" pour le village.
```

---

## 8. IMPACT SUR LA BOUCLE DE JEU

L'ordre des actions de nuit doit être étendu :

```
NUIT (ordre) :
1. Cupidon (première nuit uniquement) → désigne 2 Amoureux
2. Loups-Garous → choisissent une victime (ou Loup Alpha convertit)
3. Voyante → inspecte un joueur
4. Salvateur → protège un joueur
5. Sorcière → sauve / empoisonne / rien
6. Corbeau → désigne un joueur (+2 voix demain)
7. Petite Fille → résolution espionnage (50% voir, 20% mourir)

RÉSOLUTION DE LA NUIT :
- Si la cible des loups est protégée par le Salvateur → pas de mort
- Si la cible des loups est l'Ancien (première attaque) → pas de mort
- Si la Sorcière sauve → pas de mort
- Si la Sorcière empoisonne → mort supplémentaire
- Si la Petite Fille est repérée → mort supplémentaire

JOUR :
- Annonce des morts
- Si le Corbeau a agi → "{joueur} commence avec 2 voix contre lui"
- Débat (2 tours)
- Vote
- Si l'éliminé est le Chasseur → tir
- Si l'éliminé est l'Ancien → perte des pouvoirs village
- Si l'éliminé est l'Idiot → survit, perd le vote
- Si un des Amoureux meurt → l'autre meurt aussi
- Vérification victoire (village, loups, OU couple amoureux)
```

---

## 9. CONDITIONS DE VICTOIRE (mises à jour)

- **Village** : tous les loups éliminés
- **Loups** : nombre de loups >= nombre de non-loups vivants
- **Couple mixte** (si Cupidon actif) : les 2 Amoureux sont les derniers survivants (un Loup + un Village qui ont éliminé tout le monde ensemble)

---

## 10. CE QU'IL FAUT FAIRE MAINTENANT

1. **Verrouiller cette spec** — tu valides les rôles, les compositions, l'UI de config
2. **Créer les 7 nouvelles personnalités IA** (prompts complets comme les 7 existantes)
3. **Créer les prompts des nouveaux rôles** (comme ci-dessus, à affiner)
4. **Adapter la boucle de nuit** pour supporter les nouveaux rôles
5. **Construire l'écran de configuration** (slider joueurs + cartes rôles)
6. ENSUITE seulement : auth + paiement
