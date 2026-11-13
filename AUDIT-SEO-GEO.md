# Audit SEO + GEO : cverifie.fr

Audit réalisé le 13/11/2026. Il croise le site en production (https://cverifie.fr) et le code du repo (Eleventy 3, Netlify).
Méthode : crawl de la prod (81 URLs, liens internes compris), en-têtes HTTP par curl, lecture des sources `src/`, recherche web (présence hors site), sitemap EveryCheck (`https://www.everycheck.com/fr/sitemap.xml`, 413 URLs).
Pendant l'audit, aucun fichier existant n'a été modifié et aucun formulaire n'a été soumis.

**Légende.** **V** = vérifié (observé, preuve citée). **H** = hypothèse (à confirmer, la méthode est indiquée).
Impact et effort sont notés de 1 à 5. Priorité : **P1** = à traiter en moins d'une semaine, **P2** = sous 30 jours, **P3** = sous 90 jours.

---

## 1. Synthèse

| Axe | Note /100 | En une phrase |
|---|---|---|
| Technique | **55** | Le socle statique est sain (HTML complet sans JS, Brotli, HTTPS, 301 www). Mais toutes les pages existent en double, les canonicals contredisent les liens internes et le JSON-LD FAQ ne correspond pas au contenu affiché. |
| Contenu | **50** | Le blog couvre bien le sujet (22 articles, cadre légal, coûts, secteurs). La confiance est minée par des chiffres non sourcés ou empruntés, des affirmations invérifiables (hébergement en France, ISO 27001, « partenaires » ministériels) et des dates incohérentes. |
| LLM / GEO | **40** | Les robots IA ont accès au site et llms.txt existe. Mais l'entité est ambiguë (un homonyme « Cvérifié » existe depuis 2015 dans la presse), il n'y a aucun `sameAs` ni présence hors site, et llms-full.txt sert de **faux tarifs** aux LLM. |
| Réglages | **20** | Aucun outil d'analytics, aucune preuve de Search Console ou Bing Webmaster, pas d'IndexNow, aucun en-tête de sécurité ni de cache configuré dans `netlify.toml`. |
| **Global** | **42** | |

### Les 5 problèmes les plus coûteux
1. **Chaque page est servie deux fois** (`/contact` et `/contact.html`, toutes deux en 200). Les liens internes pointent vers `/contact`, alors que le canonical et le sitemap pointent vers `/contact.html`. Google reçoit des signaux contradictoires sur 40 URLs (T01).
2. **Des affirmations factuelles fausses ou invérifiables sont reprises par les LLM** : tarifs différents entre llms-full.txt et la page de commande, « données hébergées en France » alors que l'hébergeur déclaré est Netlify Inc. (États-Unis), badge « ISO 27001 », « 1 CV sur 8 » (chiffre d'EveryCheck) (C01, C03, C04).
3. **Entité ambiguë.** Un autre « Cvérifié » (fondateur Mickael Figuière, actif depuis 2015) est cité par le JDN. Le site dit « fondé en 2025 », avec un `sameAs` vide et un SIRET « en cours d'immatriculation ». Un LLM peut fusionner les deux entités ou ne citer aucune des deux (L02, L03, C10).
4. **Le JSON-LD FAQPage est générique et ne correspond pas au contenu visible** sur 6 pages (accueil + 5 services), et il est en double sur conformite-rgpd. Google le considère comme du balisage trompeur, et ces pages perdent leur éligibilité aux résultats enrichis (T16).
5. **Aucune mesure.** Il n'y a ni analytics ni suivi des visites venant de ChatGPT, Perplexity, etc. Impossible de piloter l'objectif « lead entrant via Google et LLM » (R01, R02).

### Les 5 gains les plus rapides
1. Ajouter un filtre `cleanUrl` dans `.eleventy.js` et l'appliquer au canonical, à og:url, au sitemap et à llms.txt, avec des redirections 301 `.html` → URL propre dans `netlify.toml`. Environ 1 h (correctif n°1).
2. Supprimer le bloc FAQ générique `hasFaq` de `base.njk` et passer en `faqItems` les 5 questions réellement affichées (correctif n°4).
3. Corriger les tarifs et les affirmations d'hébergement dans `src/llms-full.njk` et `src/index.html` (correctifs n°2 et 3).
4. Mettre `noindex` sur `/confirmation`, remplacer `Disallow: /commander.html` et réparer le lien `/services/` en 404 (correctifs n°5 et 8).
5. Installer un analytics sans cookie avec un segment « LLM », et vérifier Search Console et Bing Webmaster (correctif n°9).

---

## 2. Tableau complet des constats

### 2.1 Technique (T)

| ID | Constat | Preuve | Recommandation | Imp. | Eff. | Prio | Statut |
|---|---|---|---|---|---|---|---|
| T01 | Toutes les pages répondent en 200 sous deux URLs : `/x` et `/x.html`. Netlify réécrit les liens internes en `/x` (guillemets simples), mais le canonical, og:url, le sitemap et llms.txt utilisent `/x.html`. Résultat : 40 couples d'URLs en doublon, avec des signaux contradictoires. | `curl https://cverifie.fr/contact` → 200 et `/contact.html` → 200. Canonical de `/contact` = `https://cverifie.fr/contact.html`. `.eleventy.js:6-8` (permalien `.html`), `base.njk:10, 23, 62, 124, 479`, `src/sitemap.njk` (36 occurrences de `.html`), `src/llms.njk` (28), `src/llms-full.njk` (11), 176 `href="….html"` dans `src/` | Retenir l'URL propre comme forme canonique, puisque c'est elle que Netlify sert et lie. Ajouter un filtre `cleanUrl`, une 301 forcée `/*.html` → `/:splat` et réécrire sitemap et llms (correctif n°1) | 5 | 2 | P1 | V |
| T02 | `/services/` renvoie 404, mais il est lié par le fil d'Ariane HTML et par le BreadcrumbList JSON-LD des 5 pages services. Il n'existe aucune page hub des services. | `curl https://cverifie.fr/services/` → 404. `src/services/verification-diplomes.html:25` et `:158`, ainsi que les 4 autres pages services (`verification-experiences.html:116`, `api-integrations-rh.html:141`, `prise-de-references.html:119`, `controle-integrite.html:126`) | Créer `src/services/index.html`, une page hub « Nos vérifications » (correctif n°5) | 4 | 2 | P1 | V |
| T03 | Des liens internes pointent vers des URLs à slash final qui passent par une 301 : `/cgu/`, `/politique-de-confidentialite/`, `/conformite-rgpd/`, `/blog/verification-diplome-etranger-france/`, `/blog/rgpd-verification-candidat-guide-complet/` | `src/cgu.html:277, 284`, `src/mentions-legales.html:183`, `src/politique-de-confidentialite.html:320`, `src/conformite-rgpd.html:458, 486`. Le crawl confirme les 301. | Retirer le slash final de ces liens | 2 | 1 | P1 | V |
| T04 | `/commander.html` est dans le sitemap (priorité 0.9) mais bloqué par `Disallow: /commander.html`. Le blocage ne couvre pas `/commander`, qui est l'URL réellement liée. Le signal est incohérent et la page tarifs est invisible pour les moteurs. | `src/robots.njk:7`, `src/sitemap.njk:13` | Retirer le `Disallow` : la page porte les prix et sert de source citable. Ajouter `Offer` en JSON-LD. Sinon, mettre `noindex` et la sortir du sitemap (correctif n°8) | 2 | 1 | P1 | V |
| T05 | `/confirmation` (paiement confirmé) est indexable. | `curl /confirmation` → `meta robots index, follow`. `src/confirmation.html:1-4` (pas de variable robots), `base.njk:9` (valeur codée en dur) | Ajouter une variable `robots` dans `base.njk` et passer `noindex, nofollow` sur confirmation (correctif n°8) | 2 | 1 | P1 | V |
| T06 | L'og:image par défaut renvoie 404, donc aucun aperçu sur LinkedIn ni dans les fiches des moteurs IA. | `base.njk:125` → `curl https://cverifie.fr/images/cverifie-og.png` → 404 | Créer `src/images/cverifie-og.png` (1200×630) | 3 | 1 | P1 | V |
| T07 | Seules 22 des 38 URLs du sitemap ont un `<lastmod>`. Quatre portent la même date `2026-05-01`, et `articleModified` n'est jamais renseigné. `changefreq` et `priority` sont ignorés par Google. | `sitemap.xml` en prod. `grep articleModified src/blog` → 0 | Générer le sitemap depuis `collections.all` avec `page.date` / `articleModified` (correctif n°1) | 2 | 2 | P2 | V |
| T08 | Il n'y a aucun en-tête de sécurité (CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`). Le HSTS n'a ni `includeSubDomains` ni `preload`. | `curl -sI https://cverifie.fr/`. `netlify.toml` ne contient aucun `[[headers]]` | Ajouter un bloc `[[headers]]` (correctif n°8) | 2 | 1 | P1 | V |
| T09 | Les images locales sont servies avec `cache-control: max-age=0, must-revalidate`, donc revalidées à chaque visite. | `curl -sI /images/cverifie-logo-green-sm.png` | `Cache-Control: public, max-age=31536000, immutable` sur `/images/*`, en renommant les fichiers quand ils changent | 2 | 1 | P2 | V |
| T10 | `http://www.cverifie.fr/` fait deux sauts : vers `https://www`, puis vers l'apex. | curl | Ajouter `[[redirects]] from="http://www.cverifie.fr/*" to="https://cverifie.fr/:splat" status=301 force=true` | 1 | 1 | P2 | V |
| T11 | Les images de hero (LCP probable) viennent d'Unsplash, un domaine tiers (connexion supplémentaire, qualité `q=20` sur mobile). On compte 11 URLs Unsplash sur l'accueil et 21 sur /blog/. | `src/index.html:5-7` (preloadImage), `:664-665`. `pages/blog_.html` | Télécharger, optimiser (AVIF/WebP, 3 tailles) et servir depuis `/images/`. Licence Unsplash compatible. | 3 | 3 | P2 | V (cause). H (impact LCP : aucune donnée terrain, voir § 5) |
| T12 | Le CSS est inline et dupliqué sur chaque page (13 à 29 Ko par page, non mis en cache). Le HTML de l'accueil pèse 98 Ko. | Mesure sur les HTML en prod : accueil css=29 Ko, demo 29 Ko, blog 22 Ko | Sortir le CSS commun de `base.njk:153-475` vers `/css/base.css` en cache immutable. Garder le CSS critique du hero inline. | 2 | 3 | P3 | V |
| T13 | Google Fonts est externe : 2 familles, 10 graisses ou styles, 3 préchargements. Cela fait un domaine tiers de plus et un risque de FOUT/CLS. | `base.njk:136-148` | Héberger Outfit et Playfair en local (woff2, `font-display: swap`) et réduire le nombre de graisses à 4 | 2 | 2 | P3 | V |
| T14 | Plusieurs H1 par page : 2 sur les 18 articles (hero + `article-title`), 3 sur `/commander`, 2 sur `/demo`. | Crawl (champ h1). `src/blog/alternative-everycheck.html:92` et `:112` | Garder un seul H1 par page (correctif n°10) | 3 | 1 | P1 | V |
| T15 | HTML peu sémantique : pas de `<main>` (sauf /blog/), pas de `<article>` ni de `<time datetime>` sur les articles. | Analyse des HTML en prod | Envelopper `{{ content }}` dans `<main id="main">` (`base.njk:470`). Dans les articles, utiliser `<article>` et `<time datetime="{{ articleDate }}">` | 2 | 2 | P2 | V |
| T16 | Le JSON-LD FAQPage générique (5 questions codées en dur) est injecté sur 6 pages dont la FAQ visible est différente. Sur `/conformite-rgpd`, il y a 2 FAQPage. | `base.njk:83-118` (`hasFaq`). `src/index.html:7` affiche des questions différentes (`:1380-1430`). Questions visibles de `src/services/verification-diplomes.html` ≠ schéma. `src/conformite-rgpd.html` contient 1 FAQPage + celui du layout | Supprimer la branche `hasFaq` et passer en `faqItems` les questions affichées (correctif n°4) | 4 | 1 | P1 | V |
| T17 | Couverture JSON-LD incomplète : les 4 récits (Romand, Jones, Thompson, hub) n'ont pas de BlogPosting. Aucun BreadcrumbList sur les articles. /blog/ n'a ni CollectionPage ni ItemList. L'accueil n'a pas de Service/Offer. `/commander` n'a pas d'Offer. Le `logo` de l'Organization est en 41 Ko. | Crawl (types). `src/blog/histoire-*.html` sans `ogType: article` | Voir l'inventaire § 2.5 | 3 | 2 | P2 | V |
| T18 | `/favicon.ico` et `/apple-touch-icon.png` renvoient 404. | curl | Ajouter les deux fichiers (Google affiche le favicon dans les SERP mobiles) | 1 | 1 | P2 | V |
| T19 | `cverifie-logo-green-sm.png` pèse 41 Ko, contre 8 Ko pour la version « normale ». | `du src/images` | Recompresser le fichier | 1 | 1 | P3 | V |
| T20 | `.eleventy.js:3` copie `src/.claude` dans `_site/`. Les URLs `/.claude/*` renvoient 404 en prod, donc rien n'est exposé aujourd'hui, mais c'est fragile. | `.eleventy.js:3`, curl → 404 | Supprimer la ligne `addPassthroughCopy("src/.claude")` | 1 | 1 | P2 | V |
| T21 | Netlify tourne en `NODE_VERSION = "18"`, une version arrivée en fin de vie en avril 2025. | `netlify.toml:6` | Passer à 22 | 1 | 1 | P3 | V |

### 2.2 Contenu et E-E-A-T (C)

| ID | Constat | Preuve | Recommandation | Imp. | Eff. | Prio | Statut |
|---|---|---|---|---|---|---|---|
| C01 | Les chiffres clés sont non sourcés ou incohérents d'une page à l'autre : H1 accueil « 1 CV sur 8 » (chiffre publié par EveryCheck, qui en a fait une page `/pourquoi-everycheck/un-cv-sur-huit/`), « 70 % des employeurs ne vérifient pas », À propos « ~30 % », llms-full « 30 % à 42 % (APEC 2023, Verifdiploma 2024) » et « sondage OpinionWay pour CVérifié, 2025 ». | `src/index.html:676`, `src/a-propos.html` (bloc ~30 %), `src/llms-full.njk:47-51`, sitemap EveryCheck | Une seule source de vérité : `src/_data/stats.json`, avec source, URL et année pour chaque chiffre, cités en note visible. Retirer tout chiffre dont la source n'est pas retrouvée (correctif n°7) | 5 | 2 | P1 | V (incohérence). H (existence du sondage OpinionWay : demander le rapport) |
| C02 | La citation « Emmanuel C., fondateur d'un cabinet de vérification, Le Figaro » n'a ni lien ni date. Elle est introuvable par recherche et probablement liée à un concurrent. | `src/index.html:798` | Lier l'article source ou retirer la citation | 3 | 1 | P1 | V (absence de source). H (authenticité) |
| C03 | Les tarifs sont contradictoires. Commande : Essentiel 14,90 €, Complet 39,90 €, Intégral 79,00 €. llms-full : Essentiel 14,90 / Standard 29,90 / Complet 49,90 / Référence 69,90 € et remises de volume de 10 à 20 %. Accueil : « ROI d'une vérification à 49 € ». FAQ JSON-LD : « option express 24 h ». | `src/commander.html:280-283`, `src/llms-full.njk:282-297`, accueil (calculateur), `base.njk:97` | Créer `src/_data/offres.json` et l'utiliser partout : accueil, commander, llms, JSON-LD Offer (correctif n°2) | 5 | 1 | P1 | V |
| C04 | Des affirmations sur l'hébergement et les certifications contredisent les mentions légales : « Données hébergées en France », « stockées exclusivement en France », « serveurs certifiés ISO 27001, aucune donnée hors UE », badge « ISO 27001 · CNIL ». Les mentions légales désignent pourtant **Netlify, Inc., San Francisco**. | `src/index.html:695, 699, 758, 1414, 1503`, `src/contact.html:304`, `/mentions-legales` § 2, `src/llms-full.njk:26` | Décrire la réalité : hébergeur, sous-traitants (Stripe, formulaires), localisation des données des candidats. Retirer « ISO 27001 » sans certificat (correctif n°3) | 5 | 2 | P1 | V (contradiction). H (localisation réelle des données de dossiers : à confirmer) |
| C05 | Le comparatif EveryCheck se contredit : délai « 48-72h » dans le tableau, mais « 3 à 7 jours » dans la FAQ JSON-LD et dans llms-full. Il affirme sans preuve « seule solution » et donne un prix EveryCheck « 60-150 € ». La page affiche « Mis à jour en 2025 » alors que `articleDate` vaut 2026-01-08. | `src/blog/alternative-everycheck.html:10-15, 108, 125` | Sourcer chaque cellule (capture datée, page publique), retirer les superlatifs, aligner le délai, ajouter `articleModified`. Risque de dénigrement (art. L.121-1 du Code de la consommation) si c'est faux | 4 | 2 | P1 | V |
| C06 | Les dates visibles sont incohérentes : l'article santé indique « Mis à jour en 2024 » alors qu'il est publié le 2026-01-22. Statistiques : « chiffres clés 2025 ». Aucune date n'est indiquée au jour près. | `src/blog/verification-cv-secteur-sante-medical.html` (meta), `statistiques-mensonges-cv-france.html` (title) | Afficher `Publié le <time>` et `Mis à jour le <time>` depuis le front matter (correctif n°10) | 3 | 1 | P1 | V |
| C07 | Des titles dépassent environ 65 caractères (tronqués) : faux-diplome 99, certifications 109, diplôme étranger 81, finance 76. Des meta descriptions dépassent 170 caractères : Scott Thompson 214, légal 201, Romand 192, faux-diplôme 188. | Crawl (champs title et desc) | Réécrire (liste des nouveaux titles au correctif n°10) | 2 | 1 | P2 | V |
| C08 | Cannibalisation probable sur 4 groupes. (a) `cout-mauvais-recrutement-france` et `calculateur-cout-mauvais-recrutement`. (b) `comment-verifier-cv-diplome-pme`, `comment-verifier-diplome-francais-etape-par-etape` et `services/verification-diplomes`. (c) `verification-cv-legal-france`, `rgpd-verification-candidat-guide-complet` et `conformite-rgpd`. (d) `comment-verifier-experiences-professionnelles-candidat` et `services/verification-experiences`. | Titles et H1 du crawl | Fixer une page cible par intention (§ 2.6). Groupe (a) : fusionner, l'article devient la section « méthode » du calculateur, avec une 301 | 3 | 3 | P2 | H (à confirmer avec l'export GSC Requêtes × Pages) |
| C09 | Pages quasi orphelines : finance-banque et santé-médical ne reçoivent de liens que depuis `/blog/`. tech-startup n'en reçoit que d'un article. | `crawl.json` (inlinks) | Les intégrer au silo « Secteurs » et les lier depuis les pages services et `relatedArticles.json` | 2 | 1 | P2 | V |
| C10 | E-E-A-T faible. Auteur « Équipe CVérifié » sur les 18 articles, en `@type: Person`. SIRET « En cours d'immatriculation ». Siège au 42 av. Montaigne. Aucun avis, témoignage ni étude de cas. La page `partenaires` présente le **Ministère du Travail** et la **CNIL** comme « sources officielles » et « partenaires », avec le logo ministériel (`ministere-travail-*.png`). | `/mentions-legales` § 1, `src/partenaires.html:4, 13, 227-257`, `src/index.html:973, 1512` | Publier une page auteur ou fondateur réelle, un SIREN dès qu'il est obtenu, des cas clients anonymisés et des avis vérifiés. Renommer « Partenaires » en « Sources que nous consultons » et retirer les logos d'État, sauf convention signée | 5 | 3 | P1 | V (contenu). H (existence d'une convention avec le Ministère et domiciliation de l'adresse : à confirmer) |
| C11 | Sujets absents par rapport à EveryCheck et à la demande : témoignages et cas clients ; « vérifier un salarié déjà en poste » ; « un candidat peut-il refuser une vérification » ; extrait de casier judiciaire (B3), ce qui est légal ou non ; vérification du titre de séjour (obligation employeur, art. L.5221-8) ; vérification du niveau de langue ; pages par cible (cabinets de recrutement, ETT, BTP/sécurité, transport, ESN, luxe) ; glossaire ; page « Tarifs » dédiée ; données propriétaires (baromètre). | Sitemap EveryCheck (`/blog/peut-on-verifier-un-salarie-deja-en-poste/`, `/blog/candidat-peut-il-refuser-une-verification-antecedents/`, `/temoignage/`, `/solutions/agence-com-rh/`, `/blog/tags/top-mensonges/`). `src/blog/` | Calendrier éditorial (vague 3). Chaque page cible une intention et renvoie vers son service | 4 | 4 | P3 | V (absence). H (volumes de recherche : demander un export Semrush ou Ahrefs) |
| C12 | Les 4 récits (Romand, Jones, Thompson, hub) sont les contenus les plus « linkables » (2 000 à 2 950 mots), mais ils n'ont ni date, ni auteur, ni schéma. Le hub ne fait que 556 mots. | Crawl. `src/blog/histoire-*.html` sans `articleDate` | Ajouter `ogType: article`, `articleDate` et des sources (presse d'époque). Enrichir le hub (chronologie, leçons pour un recruteur) | 3 | 2 | P2 | V |
| C13 | Le H1 de l'accueil ne porte pas l'intention principale (« vérification de CV ») et s'appuie sur un chiffre emprunté. | `src/index.html:676` | Nouveau H1 et nouveau title (correctif n°7) | 3 | 1 | P1 | V |
| C14 | Le contenu « Pour les candidats » (badge LinkedIn) est mélangé à l'offre B2B sur l'accueil. L'intention est diluée. | Accueil (`#candidats`) | Garder une section courte, ou créer une page dédiée `/candidats` | 2 | 2 | P3 | V |

**Verdicts par page clé**

| Page | Intention | Verdict |
|---|---|---|
| `/` | Transactionnelle (« vérification CV », « vérifier diplôme candidat ») | **Réécrire** le H1, les preuves et les affirmations. La structure est bonne. |
| `/services/verification-diplomes` (2 281 mots) | Transactionnelle et informationnelle | **Garder**, corriger le fil d'Ariane et la FAQ, ajouter les tarifs |
| `/services/verification-experiences` | Transactionnelle | **Garder** et y orienter l'article C08(d) |
| `/services/prise-de-references` | Transactionnelle | **Enrichir** (exemple de rapport, grille de questions) |
| `/services/controle-integrite` | « background check France » | **Enrichir** (cadre légal du B3, comparaison avec le background check anglo-saxon) |
| `/services/api-integrations-rh` | Navigationnelle B2B | **Garder**. **H** : l'API existe-t-elle vraiment ? Sinon, réécrire en « sur demande » |
| `/commander` | Transactionnelle et tarifs | **Enrichir** : rendre crawlable, ajouter Offer en JSON-LD |
| `/demo` | Preuve | **Garder**, un seul H1 |
| `/a-propos` | Entité | **Réécrire** : fondateur, SIREN, histoire, distinction avec l'homonyme |
| `/partenaires` | Preuve | **Réécrire** (C10) |
| `/blog/alternative-everycheck` | Commerciale, comparative | **Réécrire** (C05). Page GEO prioritaire. |
| `/blog/cout-mauvais-recrutement-france` | Informationnelle | **Fusionner** avec le calculateur (C08a) |
| `/blog/statistiques-mensonges-cv-france` | Informationnelle, citable | **Réécrire** avec des sources primaires (C01) |
| 4 récits | Lien et notoriété | **Enrichir** (C12) |
| Autres articles (11) | Informationnelle | **Garder** + dates, un seul H1, titles raccourcis |
| `/confirmation` | Aucune | **noindex** |

### 2.3 LLM / GEO (L)

| ID | Constat | Preuve | Recommandation | Imp. | Eff. | Prio | Statut |
|---|---|---|---|---|---|---|---|
| L01 | Les robots IA sont autorisés. GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, bingbot et CCBot reçoivent tous 200. Aucun blocage Netlify. Mais OAI-SearchBot, Claude-SearchBot, Claude-User, Perplexity-User et Bingbot ne sont pas nommés. Les groupes IA, qui sont spécifiques, n'héritent pas de la règle `Disallow` du groupe `*`. | curl avec chaque UA → 200. `src/robots.njk:5-34` | Politique explicite (correctif n°8) | 2 | 1 | P1 | V |
| L02 | **Homonyme.** Un « Cvérifié » distinct, fondé par Mickael Figuière, actif depuis 2015 (« 3 250 candidatures examinées »), est cité aux côtés d'EveryCheck par le JDN. Le site affirme « Fondé en 2025 ». Les LLM peuvent attribuer à cverifie.fr l'historique, les chiffres ou les avis de l'autre entité, ou l'inverse. | https://www.journaldunet.com/e-rh/1193731-la-verification-de-cv-en-route-vers-la-digitalisation. `base.njk:21`, `/a-propos` | (1) Vérifier l'antériorité de la marque à l'INPI (risque juridique). (2) Désambiguïser : `legalName`, `founder`, `foundingDate`, `disambiguatingDescription`, `@id` stable. (3) Ajouter une phrase explicite dans À propos et llms.txt (correctif n°6) | 5 | 2 | P1 | V (homonyme cité). H (statut actuel de l'autre entité et marque : recherche INPI ou Pappers) |
| L03 | Aucune présence hors site détectable. La recherche `"cverifie.fr"` ne renvoie aucun résultat sur le domaine, et `sameAs: []`. Il n'y a ni LinkedIn, ni avis, ni Wikidata, ni presse. | WebSearch du 13/11/2026. `base.njk:24` | Plan hors site (vague 2-3) : page LinkedIn entreprise, fiche Trustpilot ou Avis Vérifiés, annuaires RH (Capterra/GetApp FR, Appvizer, Welcome to the Jungle Solutions), Wikidata une fois le SIREN obtenu, tribune ou étude de données auprès de la presse RH (Parlons RH, Focus RH, JDN). Mesure : nombre de domaines référents et de mentions de la marque. | 5 | 4 | P2 | V (absence). H (indexation Bing : export Bing Webmaster) |
| L04 | llms.txt est bien structuré (résumé, services, articles, informations clés). **Mais** il pointe vers des URLs `.html`, et llms-full.txt (5 060 mots) contient de faux tarifs (C03), la mention « Hébergement : France » (C04), des statistiques non vérifiées (C01) et un comparatif concurrent différent de l'article (C05). Aucun moteur majeur ne s'engage publiquement à lire llms.txt : son utilité réelle est faible, son risque réel est d'être lu par des agents. | `/llms.txt`, `/llms-full.txt`, `src/llms-full.njk:21-30, 44-51, 282-309` | Le garder, mais le générer depuis `_data/offres.json` et `_data/stats.json`, et ajouter une section « Ce que CVérifié n'est pas » (homonyme) (correctif n°2) | 4 | 1 | P1 | V |
| L05 | Bonne extractibilité : HTML statique, tableaux, FAQ, définitions. Il manque les blocs « réponse courte » en tête des pages services (définition en 2 phrases, prix, délai) et une page **Tarifs** autonome et citable. | Crawl. Absence de `/tarifs` | Ajouter un encadré « En bref » sur chaque service, créer `/tarifs` (ou rendre `/commander` citable) | 4 | 2 | P2 | V |
| L06 | Aucune donnée originale. Toutes les statistiques sont empruntées. | `src/blog/statistiques-mensonges-cv-france.html` | Publier un « Baromètre CVérifié » semestriel (taux d'écarts par type, sur les dossiers anonymisés, avec la méthode et la taille d'échantillon) dès que le volume suffit. C'est le contenu le plus cité par les LLM. | 4 | 4 | P3 | H (volume de dossiers suffisant ?) |
| L07 | Contenus « X vs Y » et guides citables : il en existe 1 (comparatif). Il manque : « CVérifié vs EveryCheck » (requête de marque concurrente), « vérification de CV gratuite vs payante », « background check vs prise de références », et un glossaire (RNCP, ENIC-NARIC, B3, apostille, RPPS). | `src/blog/` | Pages dédiées (vague 3) | 3 | 3 | P3 | V |

### 2.4 Réglages de fond (R)

| ID | Constat | Preuve | Recommandation | Imp. | Eff. | Prio | Statut |
|---|---|---|---|---|---|---|---|
| R01 | Aucun analytics dans le code (gtag, Plausible, Matomo, Umami, Clarity, PostHog : rien). | `grep -ril` sur `src/` et `netlify.toml` → 0 | Plausible ou Matomo sans cookie (aucun bandeau requis s'ils sont configurés pour l'exemption CNIL). Objectifs : clic « Lancer une vérification », paiement réussi, envoi du formulaire de contact. Segment LLM (correctif n°9) | 5 | 2 | P1 | V |
| R02 | Aucune balise de vérification Search Console ou Bing (`google-site-verification`, `msvalidate.01`), et `/BingSiteAuth.xml` renvoie 404. | `grep` → 0, curl | Vérifier par DNS TXT (domaine entier). Soumettre le sitemap. Importer GSC dans Bing (Bing alimente ChatGPT Search et Copilot) | 4 | 1 | P1 | H (vérification DNS déjà faite ? à confirmer) |
| R03 | Pas d'IndexNow. | Absence de fichier de clé | Fichier de clé `src/<clé>.txt` + ping après déploiement (plugin `netlify-plugin-indexnow` ou fonction `onSuccess`) | 2 | 1 | P2 | V |
| R04 | Ni `_redirects` ni `[[redirects]]`. | `netlify.toml` | Voir le correctif n°1 | 5 | 1 | P1 | V |
| R05 | Domaine canonique : l'apex `https://cverifie.fr` est cohérent (www → apex en 301). HSTS sans `includeSubDomains`. | curl | Garder l'apex. Compléter le HSTS (T08) | 1 | 1 | P2 | V |
| R06 | Cache Netlify : HTML en `max-age=0` (normal, Netlify purge à chaque déploiement). Assets non immutables (T09). | curl | Voir T09 | 2 | 1 | P2 | V |
| R07 | Google Business Profile : service 100 % en ligne, adresse au 42 av. Montaigne. Une fiche n'est éligible qu'avec un accueil physique ou une zone desservie réelle. | `/mentions-legales` | **Ne pas créer** de fiche tant qu'il n'y a pas de locaux recevant du public (risque de suspension). Privilégier LinkedIn et les plateformes d'avis. | 1 | 1 | P3 | H (nature de l'adresse : domiciliation ?) |

### 2.5 Inventaire JSON-LD par gabarit

| Gabarit | Présent (V) | Manquant ou à corriger |
|---|---|---|
| Toutes les pages | Organization (`sameAs` vide, pas d'`@id`, contactPoint vers `.html`), WebSite | `@id`, `legalName`, `founder`, `sameAs`, `email`, `disambiguatingDescription` (correctif n°6) |
| Accueil | + FAQPage générique (ne correspond pas au contenu, T16) | FAQPage depuis la FAQ visible. `Service` + `OfferCatalog` (3 offres réelles) |
| Service ×5 | Service, Offer, BreadcrumbList (`/services/` en 404), FAQPage générique | Breadcrumb réparé, FAQPage depuis les questions visibles, `offers.price` aligné sur `offres.json` |
| Article ×18 | BlogPosting (auteur `Person` « Équipe CVérifié », pas d'image), FAQPage spécifique | `author` = Person réelle avec `url`, `image`, `dateModified` réelle, BreadcrumbList |
| Récit ×4 | Aucun | BlogPosting (ou `Article`), `about` = Person (Romand, etc.) |
| /blog/ | Aucun | `CollectionPage` + `ItemList` |
| /commander | Aucun | `Product`/`Service` + `Offer` ×3 (prix, `priceCurrency: EUR`) |
| /partenaires | ItemList d'Organization (Ministère…) | À revoir avec C10 : ne pas suggérer de partenariat |
| /conformite-rgpd | FAQPage ×2 | Une seule |

### 2.6 Maillage et silos proposés

```
/  (marque + « vérification de CV »)
├── /services/  (hub, à créer)                 ← lié depuis la nav et le fil d'Ariane
│   ├── verification-diplomes   ← articles : comment-verifier-diplome-francais, verification-diplome-etranger,
│   │                             faux-diplome-grande-ecole, verifier-certifications (CACES/IT)
│   ├── verification-experiences ← comment-verifier-experiences, faux-cv-exemples-detecter-signaux
│   ├── prise-de-references      ← (nouveau) « questions à poser lors d'une prise de références »
│   ├── controle-integrite       ← (nouveau) « casier judiciaire B3 : ce qu'un employeur peut demander »
│   └── api-integrations-rh
├── /tarifs (ou /commander)      ← combien-coute-verification-cv, calculateur (fusionné avec cout-mauvais-recrutement)
├── Silo « Légal »               : verification-cv-legal-france (pilier) → rgpd-verification-candidat, que-faire-candidat-ment,
│                                  (nouveau) candidat-peut-il-refuser, (nouveau) verifier-salarie-en-poste ; /conformite-rgpd = page de confiance
├── Silo « Secteurs »            : (nouveau hub /blog/secteurs) → finance, santé, tech, (nouveaux) BTP-sécurité, transport, ESN, luxe
├── Silo « Comparatifs »         : alternative-everycheck → (nouveaux) cverifie-vs-everycheck, gratuit-vs-payant
└── Silo « Histoires vraies »    : hub → Romand, Jones, Thompson (liens retour vers verification-diplomes)
```
Règle de maillage : chaque article envoie au moins 1 lien contextuel vers son service et 2 liens vers des articles de son silo. Chaque service envoie des liens vers son pilier et vers /tarifs. Mettre à jour `src/_data/relatedArticles.json` par silo.

---

## 3. Plan d'action en trois vagues

### Vague 1 (moins d'une semaine)
| Action | Fichiers ou réglages | Critère de réussite mesurable |
|---|---|---|
| URLs propres, canonicals, 301 `.html` (T01, R04) | `.eleventy.js`, `base.njk`, `sitemap.njk`, `llms*.njk`, `netlify.toml` | `curl -I /contact.html` → 301 vers `/contact`. Canonical de `/contact` = `/contact`. Dans GSC sous 4 à 6 semaines, « Autre page avec balise canonique correcte » ne liste plus les URLs propres |
| Une seule source pour les tarifs, correction de llms-full (C03, L04) | `src/_data/offres.json`, `index.html`, `commander.html`, `llms-full.njk`, `base.njk` | `grep -rn "29,90\|49,90\|69,90" _site` → 0 |
| Affirmations hébergement, ISO, partenaires (C04, C10) | `index.html`, `contact.html`, `partenaires.html`, `llms-full.njk` | Plus aucune mention « hébergées en France » ni « ISO 27001 » sans preuve |
| FAQPage = FAQ visible (T16) | `base.njk`, `index.html`, `services/*.html`, `conformite-rgpd.html` | Test des résultats enrichis : 0 erreur, et les questions du schéma correspondent aux questions affichées |
| Hub `/services/`, liens à slash final (T02, T03) | `src/services/index.html`, `cgu.html`, `mentions-legales.html`, `politique-de-confidentialite.html`, `conformite-rgpd.html` | Re-crawl : 0 lien interne vers une 404 ou une 301 |
| noindex confirmation, robots IA, en-têtes (T04, T05, T08, L01) | `robots.njk`, `base.njk`, `confirmation.html`, `netlify.toml` | securityheaders.com ≥ A. `/confirmation` porte `noindex` |
| og:image, favicon (T06, T18) | `src/images/` | 200 sur les 3 fichiers |
| Analytics, GSC, Bing (R01, R02) | `base.njk`, DNS | Premières sessions visibles. Sitemap « Réussi » dans GSC et Bing |

### Vague 2 (30 jours)
| Action | Fichiers ou réglages | Critère de réussite |
|---|---|---|
| Entité : JSON-LD Organization complet, page fondateur, À propos réécrit, LinkedIn, sameAs (L02, L03, C10) | `base.njk`, `a-propos.html`, nouveau `src/equipe.html` | Rich Results Test valide. Une requête « CVérifié vérification CV » dans ChatGPT, Perplexity et Gemini (protocole § 5) ne confond plus avec l'homonyme de 2015 |
| Un seul H1, dates visibles, titles raccourcis (T14, C06, C07) | 18 articles + `commander.html`, `demo.html` | Crawl : 1 H1 par page. Titles ≤ 65 caractères, meta descriptions ≤ 160 |
| Statistiques sourcées (C01, C02, C13) | `_data/stats.json`, `index.html`, `statistiques-mensonges-cv-france.html` | 100 % des chiffres affichés ont une source cliquable |
| Comparatif EveryCheck corrigé (C05) | `alternative-everycheck.html` | Chaque cellule a une source datée |
| Images auto-hébergées, cache immutable (T09, T11) | `src/images/`, `netlify.toml` | Lighthouse mobile LCP < 2,5 s en labo. CrUX quand il sera disponible |
| Schémas manquants : récits, blog, commander (T17, C12) | `histoire-*.html`, `blog/index.html`, `commander.html` | Rich Results Test valide sur les 3 gabarits |
| Fusion des pages coût (C08a), maillage par silo (C09) | `relatedArticles.json`, 301 `cout-mauvais-recrutement-france` → calculateur | 0 page avec moins de 3 liens internes entrants |
| IndexNow (R03) | `netlify.toml` | Bing Webmaster, rapport IndexNow : URLs reçues |
| Avis clients (L03) | Trustpilot ou Avis Vérifiés + `AggregateRating` uniquement sur de vrais avis | ≥ 10 avis vérifiés |

### Vague 3 (90 jours)
| Action | Fichiers ou réglages | Critère de réussite |
|---|---|---|
| 8 à 10 nouvelles pages (C11, L07) : salarié en poste, refus du candidat, casier B3, titre de séjour, niveau de langue, CVérifié vs EveryCheck, gratuit vs payant, glossaire, 4 pages secteurs | `src/blog/`, `src/services/` | Les pages indexées (GSC) et ≥ 1 requête top 20 par page à J+60 |
| Page `/tarifs` + encadrés « En bref » sur les services (L05) | nouvelles sections | Taux de citation de cverifie.fr sur les 20 prompts de suivi (§ 5) |
| Baromètre CVérifié (L06) | `src/blog/barometre-…` + communiqué | ≥ 3 reprises presse ou domaines référents |
| CSS externalisé, polices locales (T12, T13) | `base.njk`, `/css/` | HTML de l'accueil < 70 Ko |
| Relations presse et annuaires RH (L03) | hors site | ≥ 10 domaines référents thématiques, Wikidata créé |

---

## 4. Correctifs prêts à appliquer (10 actions prioritaires, non appliqués)

### Correctif n°1 : URLs propres (T01, T07, R04)

`.eleventy.js`
```diff
 module.exports = function(eleventyConfig) {
   eleventyConfig.addPassthroughCopy("src/images");
-  eleventyConfig.addPassthroughCopy("src/.claude");
+
+  // URL publique propre : /contact.html -> /contact, /index.html -> /, /blog/index.html -> /blog/
+  eleventyConfig.addFilter("cleanUrl", (url) =>
+    (url || "").replace(/index\.html$/, "").replace(/\.html$/, "")
+  );
```

`src/_includes/layouts/base.njk`
```diff
-<link rel="canonical" href="https://cverifie.fr{{ page.url }}">
+<link rel="canonical" href="https://cverifie.fr{{ page.url | cleanUrl }}">
@@
-  "contactPoint": { "@type": "ContactPoint", "contactType": "customer support", "url": "https://cverifie.fr/contact.html", "areaServed": "FR" },
+  "contactPoint": { "@type": "ContactPoint", "contactType": "customer support", "url": "https://cverifie.fr/contact", "areaServed": "FR" },
@@
-  "mainEntityOfPage": { "@type": "WebPage", "@id": "https://cverifie.fr{{ page.url }}" }
+  "mainEntityOfPage": { "@type": "WebPage", "@id": "https://cverifie.fr{{ page.url | cleanUrl }}" }
@@
-<meta property="og:url" content="https://cverifie.fr{{ page.url }}">
+<meta property="og:url" content="https://cverifie.fr{{ page.url | cleanUrl }}">
@@
-      <a href="/blog/{{ item.slug }}.html" class="lire-aussi-card">
+      <a href="/blog/{{ item.slug }}" class="lire-aussi-card">
```

`src/sitemap.njk` : remplacer la liste écrite à la main par une génération automatique.
```njk
---
permalink: /sitemap.xml
eleventyExcludeFromCollections: true
---
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{%- for p in collections.all %}
{%- if not p.data.noindex and p.url and not ("/confirmation" in p.url) %}
  <url>
    <loc>https://cverifie.fr{{ p.url | cleanUrl }}</loc>
    <lastmod>{{ (p.data.articleModified or p.data.articleDate or p.date) | string | truncate(10, true, "") }}</lastmod>
  </url>
{%- endif %}
{%- endfor %}
</urlset>
```
> Contrôler le rendu de `lastmod` : `p.date` est un objet Date. Si besoin, ajouter un filtre `isoDate` dans `.eleventy.js` : `d => new Date(d).toISOString().slice(0,10)`.

`src/llms.njk`, `src/llms-full.njk` et les 176 `href="….html"` de `src/` : rechercher et remplacer `.html"` par `"` sur les liens internes, puis vérifier avec `grep -rn 'href="/[^"]*\.html"' src` → 0.

`netlify.toml` (ajout). Avec « Pretty URLs » actif, les fichiers `.html` sont servis aux deux adresses. `force = true` impose la 301 même quand le fichier existe. **À tester sur un deploy preview** (`curl -I` sur `/contact.html`, `/contact`, `/blog/`, `/`) avant la mise en production.
```toml
[[redirects]]
  from = "/index.html"
  to = "/"
  status = 301
  force = true

[[redirects]]
  from = "/blog/index.html"
  to = "/blog/"
  status = 301
  force = true

[[redirects]]
  from = "/*.html"
  to = "/:splat"
  status = 301
  force = true

[[redirects]]
  from = "http://www.cverifie.fr/*"
  to = "https://cverifie.fr/:splat"
  status = 301
  force = true
```

### Correctif n°2 : une seule source pour les tarifs (C03, L04)

Nouveau `src/_data/offres.json`. Les valeurs viennent de `src/commander.html:280-283`, la seule page où l'on paie réellement.
```json
[
  { "id": "essentiel", "nom": "Essentiel", "prix": "14.90", "prixAffiche": "14,90 €", "contenu": "Vérification du diplôme principal", "delai": "48 h ouvrées" },
  { "id": "complet",   "nom": "Complet",   "prix": "39.90", "prixAffiche": "39,90 €", "contenu": "Diplôme + expériences professionnelles (contact des anciens employeurs)", "delai": "48 h ouvrées" },
  { "id": "integral",  "nom": "Intégral",  "prix": "79.00", "prixAffiche": "79,00 €", "contenu": "Complet + prise de références et certifications", "delai": "48 h ouvrées" }
]
```
> **À confirmer** : le contenu exact de chaque formule, l'option express 24 h et les remises de volume. Sans confirmation, retirer « option express 24 h » (`base.njk:97`) et le bloc « Dégressif volume » (`llms-full.njk:291-297`).

`src/llms-full.njk`, section 9, à remplacer par :
```njk
## 9. Tarification (prix TTC affichés sur https://cverifie.fr/commander)

| Formule | Prix | Contenu | Délai |
|---|---|---|---|
{%- for o in offres %}
| {{ o.nom }} | {{ o.prixAffiche }} | {{ o.contenu }} | {{ o.delai }} |
{%- endfor %}

Aucun abonnement. Paiement à l'acte par carte (Stripe).
```
> Préciser HT ou TTC (llms-full dit « HT », la page de commande n'en dit rien).

### Correctif n°3 : affirmations d'hébergement et de certification (C04)

`src/index.html:695`, `:1503` et `src/contact.html:304` :
```diff
-          Données hébergées en France
+          Données traitées dans l'UE, conformément au RGPD
```
`src/index.html:758` :
```diff
-      Données stockées exclusivement en France
+      Consentement du candidat recueilli avant toute vérification
```
`src/index.html:1414`, réponse de FAQ :
```diff
-Toutes les données sont hébergées en France sur des serveurs certifiés ISO 27001. Aucune donnée n'est transmise hors de l'UE.
+Le site est hébergé par Netlify et les paiements sont traités par Stripe. Les dossiers des candidats sont [lieu réel à compléter], conservés [durée] puis supprimés. La liste de nos sous-traitants figure dans la politique de confidentialité.
```
`src/index.html:699` : retirer « ISO 27001 » du badge, sauf certificat (numéro et organisme) publiable.
`src/llms-full.njk:26` : remplacer `Hébergement : France (Netlify CDN avec infrastructure européenne)` par la même formulation factuelle.
> **Pourquoi c'est P1** : une allégation fausse sur la localisation des données expose à une pratique commerciale trompeuse, et les LLM la répètent telle quelle.

### Correctif n°4 : FAQPage aligné sur la FAQ visible (T16)

`base.njk` : supprimer tout le bloc `{% elif hasFaq %} … {% endif %}` (lignes 83-118) et ne garder que la branche `faqItems`.
`src/index.html`, front matter : remplacer `hasFaq: true` par les 6 questions affichées (texte des réponses = texte visible, sans abréviation).
```yaml
faqItems:
  - q: "Est-ce que je dois obtenir l'accord du candidat ?"
    a: "Oui, c'est une obligation légale en France (articles L.1221-8 et L.1221-9 du Code du travail). CVérifié gère automatiquement l'envoi et la signature du consentement."
  - q: "Que se passe-t-il si le candidat refuse ?"
    a: "Si le candidat refuse de donner son consentement, nous vous remboursons intégralement ou vous offrons un crédit."
  - q: "Que peut-on légalement vérifier en France ?"
    a: "Les éléments factuels du CV en lien direct avec le poste : diplômes obtenus, dates et intitulés de postes, certifications."
  - q: "Comment sont protégées les données du candidat ?"
    a: "[reprendre la réponse corrigée du correctif n°3]"
  - q: "Puis-je vérifier un candidat international ?"
    a: "Oui. Nous couvrons les établissements d'enseignement supérieur en France et dans plus de 80 pays."
  - q: "Y a-t-il un abonnement ou un engagement minimum ?"
    a: "Non. CVérifié fonctionne à l'acte : vous payez uniquement lorsque vous lancez une vérification."
```
> Recopier le texte exact des réponses depuis `src/index.html:1380-1430`. Les réponses ci-dessus sont tronquées comme à l'affichage du crawl.

Faire de même pour les 5 pages `src/services/*.html` (questions visibles, par exemple « Qu'est-ce qu'une vérification de diplôme ? » sur verification-diplomes). Sur `src/conformite-rgpd.html`, supprimer `hasFaq: true` et garder son FAQPage propre.

### Correctif n°5 : hub `/services/` (T02)

Nouveau `src/services/index.html`, rendu à `/services/` grâce au filtre `cleanUrl` et au permalien `.html`. Vérifier que `/services/index.html` est bien servi à `/services/`, ce que Netlify fait par défaut.
```yaml
---
layout: base.njk
title: "Vérification de CV, diplômes et références : nos 5 services | CVérifié"
description: "Diplômes, expériences, références, contrôle d'intégrité et API : comparez les vérifications CVérifié, leurs prix et leurs délais. Dès 14,90 €, sous 48 h."
---
```
Plan de page :
- **H1** : Nos services de vérification de CV
- **Encadré « En bref »** (40 mots, citable) : ce que fait CVérifié, ses prix (`offres.json`) et son délai
- **H2** Quel contrôle pour quel poste ? Tableau : poste ou risque → service recommandé → formule → prix
- **H2** Vérification de diplômes → lien
- **H2** Vérification d'expériences → lien
- **H2** Prise de références → lien
- **H2** Contrôle d'intégrité → lien
- **H2** API et intégrations RH → lien
- **H2** Ce que nous ne vérifions pas (et pourquoi) : vie privée, santé, opinions (art. L.1221-6)
- **H2** Questions fréquentes : 4 questions, en `faqItems`
- **CTA** vers `/commander`

Ajouter « Services » dans `src/_includes/nav.njk`, après « Comment ça marche ».

### Correctif n°6 : entité (L02, L03, C10)

Remplacer le bloc Organization de `base.njk:13-26` :
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://cverifie.fr/#organization",
  "name": "CVérifié",
  "alternateName": "cverifie.fr",
  "legalName": "[raison sociale exacte au registre]",
  "url": "https://cverifie.fr/",
  "logo": { "@type": "ImageObject", "url": "https://cverifie.fr/images/cverifie-logo-green.png", "width": 512, "height": 512 },
  "image": "https://cverifie.fr/images/cverifie-og.png",
  "description": "Service en ligne de vérification de CV, diplômes, expériences et références pour les recruteurs en France. Rapport sous 48 h ouvrées, à l'acte, dès 14,90 €.",
  "disambiguatingDescription": "CVérifié (cverifie.fr), fondé en 2025, est distinct de la société « Cvérifié » citée dans la presse RH depuis 2015.",
  "foundingDate": "2025",
  "founder": { "@type": "Person", "@id": "https://cverifie.fr/a-propos#fondateur", "name": "[Prénom Nom]", "jobTitle": "Fondateur", "sameAs": ["[URL LinkedIn]"] },
  "identifier": { "@type": "PropertyValue", "propertyID": "SIREN", "value": "[SIREN]" },
  "address": { "@type": "PostalAddress", "addressCountry": "FR", "addressLocality": "Paris", "postalCode": "75008" },
  "email": "contact@cverifie.fr",
  "areaServed": { "@type": "Country", "name": "France" },
  "knowsAbout": ["vérification de CV", "vérification de diplômes", "prise de références", "RGPD recrutement", "background check France"],
  "contactPoint": { "@type": "ContactPoint", "contactType": "customer support", "email": "contact@cverifie.fr", "url": "https://cverifie.fr/contact", "areaServed": "FR", "availableLanguage": "fr" },
  "sameAs": ["[https://www.linkedin.com/company/…]", "[https://fr.trustpilot.com/review/cverifie.fr]", "[https://www.wikidata.org/wiki/Q…]"]
}
```
> Ne publier que des champs réels. Laisser vides les `[…]` non disponibles, ou les supprimer. La phrase de `disambiguatingDescription` doit d'abord être validée juridiquement, après la vérification INPI (L02).

Ajouter dans `WebSite` : `"publisher": { "@id": "https://cverifie.fr/#organization" }`.

Dans `src/llms.njk`, sous le résumé :
```md
> À ne pas confondre : CVérifié (cverifie.fr, fondé en 2025) n'a pas de lien avec la société « Cvérifié » citée dans des articles de presse de 2017-2018.
```

### Correctif n°7 : accueil, title et H1, chiffres sourcés (C01, C02, C13)

`src/index.html`, front matter :
```diff
-title: "CVérifié · Vérification de CV & Diplômes en 48h"
+title: "Vérification de CV et de diplômes en ligne, sous 48 h | CVérifié"
```
(62 caractères.) H1 (`src/index.html:676`) :
```diff
-        1 CV sur 8<br>
-        cache un mensonge majeur.<br>
-        Vérifiez en 2 minutes.
+        Vérification de CV et de diplômes<br>
+        avant l'embauche, en 48 h.
```
Le chiffre peut rester juste sous le H1, sourcé : « Selon EveryCheck (étude 2021), une candidature sur huit comporte un mensonge majeur [lien]. »
`src/index.html:798` : retirer la citation « Emmanuel C., … Le Figaro », ou la lier à l'article d'origine avec sa date.
Nouveau `src/_data/stats.json` : `[{ "valeur": "1 sur 8", "libelle": "candidatures avec un mensonge majeur", "source": "EveryCheck", "annee": 2021, "url": "[URL primaire]" }, …]`, utilisé par l'accueil, `/a-propos`, `statistiques-mensonges-cv-france` et `llms-full.njk:44-51`. Supprimer la ligne OpinionWay si le rapport n'est pas disponible.

### Correctif n°8 : robots.txt, noindex, en-têtes (T04, T05, T08, T09, L01)

`src/robots.njk` :
```
User-agent: *
Allow: /
Disallow: /confirmation

# Moteurs de recherche et assistants IA : accès autorisé (objectif : être cité)
User-agent: Googlebot
User-agent: Bingbot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: GPTBot
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: ClaudeBot
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Google-Extended
User-agent: Applebot
User-agent: Applebot-Extended
Allow: /
Disallow: /confirmation

Sitemap: https://cverifie.fr/sitemap.xml
```
> Politique proposée : tout autoriser, y compris les robots d'entraînement (GPTBot, ClaudeBot, Google-Extended). L'objectif est la notoriété, et le contenu n'a pas de valeur exclusive. Si tu veux refuser l'entraînement tout en restant cité, mets `Disallow: /` pour GPTBot, ClaudeBot, Google-Extended, Applebot-Extended et CCBot, et garde OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot et Perplexity-User.

`base.njk:9` :
```diff
-<meta name="robots" content="index, follow">
+<meta name="robots" content="{{ robots if robots else 'index, follow, max-image-preview:large, max-snippet:-1' }}">
```
`src/confirmation.html`, front matter : ajouter `robots: "noindex, nofollow"` et `noindex: true`.

`netlify.toml` :
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Strict-Transport-Security = "max-age=63072000; includeSubDomains"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    X-Frame-Options = "SAMEORIGIN"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"

[[headers]]
  for = "/images/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```
> Ajouter ensuite une CSP en `Content-Security-Policy-Report-Only` (Stripe, Google Fonts, Unsplash, analytics), observer une semaine, puis l'appliquer.

### Correctif n°9 : mesure (R01, R02, R03)

`base.njk`, avant `</head>` (exemple Plausible, sans cookie) :
```html
<script defer data-domain="cverifie.fr" src="https://plausible.io/js/script.tagged-events.outbound-links.js"></script>
```
Objectifs : `Commande lancée` (clic sur `/commander`), `Paiement confirmé` (pageview `/confirmation`), `Contact envoyé`.
Segment « LLM » : sources `chatgpt.com`, `chat.openai.com`, `perplexity.ai`, `claude.ai`, `gemini.google.com`, `copilot.microsoft.com`, et `utm_source=chatgpt.com` (que ChatGPT ajoute aux liens).
Search Console : propriété « Domaine » par TXT DNS, sitemap `https://cverifie.fr/sitemap.xml`. Bing Webmaster : import depuis GSC. IndexNow : clé dans `src/<clé>.txt` et ping après chaque déploiement.

### Correctif n°10 : gabarit article (T14, C06, C07, C12)

Dans les 18 articles, transformer le H1 du hero en paragraphe (exemple `src/blog/alternative-everycheck.html:92`) :
```diff
-    <h1 style="font-family:'Playfair Display',serif;…">EveryCheck, VerifCV, CVérifié : quel service choisir en France ?</h1>
+    <p class="hero-title" style="font-family:'Playfair Display',serif;…">EveryCheck, VerifCV, CVérifié : quel service choisir en France ?</p>
```
Remplacer le libellé « Mis à jour en 20xx » par :
```njk
<span>Publié le <time datetime="{{ articleDate }}">{{ articleDate }}</time></span>
{% if articleModified %}<span>Mis à jour le <time datetime="{{ articleModified }}">{{ articleModified }}</time></span>{% endif %}
```
Ajouter `articleModified` dans chaque front matter quand le contenu change. Ajouter `ogType: article`, `articleDate` et `articleAuthor` aux 4 récits.

Nouveaux titles (≤ 65 caractères) :
| Fichier | Nouveau title |
|---|---|
| `faux-diplome-grande-ecole-hec-sciences-po.html` | Faux diplôme HEC, Sciences Po, ESSEC : risques et contrôles \| CVérifié |
| `verifier-certifications-professionnelles-caces-it.html` | Vérifier un CACES, une habilitation ou une certif IT \| CVérifié |
| `verification-diplome-etranger-france.html` | Vérifier un diplôme étranger : ENIC-NARIC, apostille \| CVérifié |
| `verification-cv-finance-banque-conseil.html` | Vérification de CV en finance : MBA, CFA, AMF \| CVérifié |
| `alternative-everycheck.html` | Alternative à EveryCheck : comparatif 2026 \| CVérifié |

Author Person réel dans `base.njk:53-56` :
```njk
"author": { "@type": "Person", "name": "{{ articleAuthor }}", "url": "https://cverifie.fr/a-propos#fondateur" },
```
Utiliser `"@type": "Organization"` tant que l'auteur reste « Équipe CVérifié ».

---

## 5. Données manquantes (à demander)

| Donnée | Pourquoi | Export à demander |
|---|---|---|
| Performances Search Console sur 16 mois | Positions, clics, cannibalisation (C08), requêtes de marque | GSC > Performances > Requêtes × Pages (CSV) + Pages > Indexation (pages non indexées et motifs) |
| Bing Webmaster Tools | ChatGPT Search et Copilot s'appuient sur l'index Bing | Rapport « Site Explorer » + « Search Performance » |
| Analytics | Aucun outil en place (R01) | À installer. Aucune donnée historique n'est possible |
| Core Web Vitals terrain | Je n'ai produit aucune valeur LCP/INP/CLS. Seules les causes sont tirées du code | GSC > Signaux Web essentiels, ou CrUX (`https://pagespeed.web.dev/` sur `/` et `/blog/`). Le volume est peut-être insuffisant pour CrUX |
| Backlinks et domaines référents | Mesurer la notoriété (L03) | Ahrefs, Semrush ou Majestic : export des domaines référents de cverifie.fr et everycheck.com |
| Volumes de recherche FR | Prioriser les sujets de C11 | Semrush ou Google Keyword Planner sur la liste C11 |
| Visibilité LLM de départ | Mesurer le GEO | Protocole : 20 prompts (« meilleur service de vérification de CV en France », « alternative à EveryCheck », « combien coûte une vérification de diplôme »…) dans ChatGPT, Perplexity, Gemini, Claude et AI Overviews, une fois par mois. Noter si CVérifié est cité, avec quelle URL, et si les faits sont justes. Outil possible : suivi AEO HubSpot, Profound, Peec AI |
| Statut juridique | SIREN, nom légal, antériorité de la marque face à l'homonyme de 2015 (L02) | Extrait INSEE/INPI, recherche de marque INPI « CVÉRIFIÉ » |
| Preuves | Sources des chiffres (OpinionWay 2025 ?), certificat ISO 27001, convention avec le Ministère, lieu réel de stockage des dossiers, existence de l'API | Documents internes |
| Clients et avis | E-E-A-T, études de cas | Liste de clients acceptant d'être cités, et volume de dossiers traités |
| Réglages Netlify | Confirmer « Pretty URLs » et « Asset optimization » (réécriture des liens observée) | Netlify > Site configuration > Build & deploy > Post processing (capture) |

---

*Sources externes consultées : https://www.journaldunet.com/e-rh/1193731-la-verification-de-cv-en-route-vers-la-digitalisation · https://www.everycheck.com/fr/sitemap.xml · https://www.everycheck.com/robots.txt · résultats de recherche sur « 1 CV sur 8 » (étude EveryCheck 2021, reprise notamment par welcometothejungle.com et ladn.eu).*
