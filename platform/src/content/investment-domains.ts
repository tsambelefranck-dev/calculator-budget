/**
 * Fiches du centre d'investissement (contenu pédagogique général).
 * - Aucune donnée de marché chiffrée n'est présentée comme un fait : les ordres de grandeur
 *   de capital sont qualitatifs et marqués comme indicatifs.
 * - Les sources sont des institutions officielles à consulter ; `consultedAt: null` signifie
 *   qu'elles n'ont pas été consultées automatiquement lors de la rédaction (à vérifier par
 *   l'équipe éditoriale, qui peut mettre à jour la date depuis l'administration).
 */
import type { SourceRef } from '../server/db/schema';

export interface InvestmentDomainSeed {
  slug: string;
  name: string;
  icon: string;
  summary: string;
  description: string;
  howItWorks: string;
  startingCapital: string;
  skills: string[];
  riskLevel: number;
  horizon: string;
  liquidity: string;
  costs: string;
  returnPotential: string;
  lossRisks: string;
  example: string;
  sources: SourceRef[];
  infoNature: 'documente' | 'hypothese' | 'mixte';
}

const BRVM: SourceRef = { label: 'BRVM — Bourse Régionale des Valeurs Mobilières (UEMOA)', url: 'https://www.brvm.org', consultedAt: null };
const AMF: SourceRef = { label: 'AMF-UMOA — Autorité des Marchés Financiers de l’UMOA', url: 'https://www.amf-umoa.org', consultedAt: null };
const COSUMAF: SourceRef = { label: 'COSUMAF — Commission de Surveillance du Marché Financier de l’Afrique Centrale', url: 'https://www.cosumaf.org', consultedAt: null };
const BCEAO: SourceRef = { label: 'BCEAO — Banque Centrale des États de l’Afrique de l’Ouest', url: 'https://www.bceao.int', consultedAt: null };
const BEAC: SourceRef = { label: 'BEAC — Banque des États de l’Afrique Centrale', url: 'https://www.beac.int', consultedAt: null };
const UMOA_TITRES: SourceRef = { label: 'Agence UMOA-Titres — titres publics de l’UEMOA', url: 'https://www.umoatitres.org', consultedAt: null };
const OHADA: SourceRef = { label: 'OHADA — droit des affaires harmonisé', url: 'https://www.ohada.org', consultedAt: null };
const FAO: SourceRef = { label: 'FAO — Organisation des Nations unies pour l’alimentation et l’agriculture', url: 'https://www.fao.org', consultedAt: null };
const IRENA: SourceRef = { label: 'IRENA — Agence internationale pour les énergies renouvelables', url: 'https://www.irena.org', consultedAt: null };

export const INVESTMENT_DOMAINS: InvestmentDomainSeed[] = [
  {
    slug: 'agriculture',
    name: 'Agriculture et agroalimentaire',
    icon: 'sprout',
    summary: 'Cultures, élevage, transformation (jus, farines, huiles) : une demande alimentaire forte, des risques naturels réels.',
    description: 'Investir dans la production agricole, l’élevage ou la transformation de produits locaux. La demande alimentaire est structurelle, mais la rentabilité dépend fortement du climat, des prix et de l’accès au marché.',
    howItWorks: 'Tu finances des intrants (semences, engrais, aliments du bétail), du foncier ou du matériel, puis tu vends la récolte ou les produits transformés. La transformation permet souvent de mieux valoriser la production qu’une vente brute au moment de la récolte.',
    startingCapital: 'Indicatif et très variable : de quelques dizaines de milliers de FCFA (petit élevage, maraîchage sur une petite parcelle) à plusieurs millions (exploitation mécanisée, unité de transformation).',
    skills: ['Connaissances techniques de la filière', 'Gestion de stocks', 'Commercialisation', 'Suivi rigoureux sur le terrain'],
    riskLevel: 4,
    horizon: 'Court (cycle de culture) à long terme (plantations pérennes)',
    liquidity: 'Faible pendant le cycle : l’argent est immobilisé jusqu’à la vente.',
    costs: 'Intrants, main-d’œuvre, transport, stockage, pertes post-récolte, éventuel loyer foncier.',
    returnPotential: 'Variable selon la filière, la maîtrise technique et le prix de vente ; pas de rendement garanti.',
    lossRisks: 'Sécheresse ou inondation, maladies, chute des prix à la récolte, vol, gestion à distance défaillante (fréquente dans les projets « agro » gérés par un tiers).',
    example: 'Un salarié finance un petit élevage de poulets de chair géré par un parent. Il exige un suivi écrit des dépenses et des ventes à chaque bande avant de réinvestir.',
    sources: [FAO],
    infoNature: 'mixte',
  },
  {
    slug: 'immobilier',
    name: 'Immobilier',
    icon: 'building',
    summary: 'Terrain, construction, location : un actif tangible, peu liquide, exigeant en capital et en vigilance juridique.',
    description: 'Acheter un terrain, construire ou acquérir un logement pour l’occuper, le louer ou le revendre. C’est souvent le projet patrimonial majeur en Afrique francophone.',
    howItWorks: 'Les revenus viennent des loyers et d’une éventuelle plus-value à la revente. La construction se fait souvent par étapes, au rythme de l’épargne.',
    startingCapital: 'Élevé : un terrain dans une ville secondaire peut représenter plusieurs millions de FCFA ; une construction bien davantage. Le montant dépend fortement de la ville et du quartier.',
    skills: ['Vérification foncière', 'Suivi de chantier', 'Gestion locative', 'Négociation'],
    riskLevel: 3,
    horizon: 'Long terme (plus de 5 ans)',
    liquidity: 'Très faible : revendre peut prendre des mois.',
    costs: 'Frais de notaire et d’enregistrement, titre foncier, matériaux, main-d’œuvre, entretien, impôts fonciers, vacance locative.',
    returnPotential: 'Loyers réguliers si le bien est bien situé et entretenu ; valorisation possible du foncier. Aucun rendement n’est garanti.',
    lossRisks: 'Litiges fonciers (double vente, terrain sans titre), malfaçons, détournement des fonds de chantier, locataires insolvables.',
    example: 'Avant d’acheter un terrain, vérifier l’existence et la validité du titre foncier auprès des services compétents, et payer de façon traçable devant notaire.',
    sources: [OHADA],
    infoNature: 'mixte',
  },
  {
    slug: 'commerce',
    name: 'Commerce',
    icon: 'store',
    summary: 'Boutique, revente, commerce en ligne : rotation rapide du capital, forte concurrence.',
    description: 'Acheter des marchandises pour les revendre avec une marge : boutique de quartier, vente de vêtements, produits cosmétiques, commerce en ligne via les réseaux sociaux.',
    howItWorks: 'Le bénéfice vient de la marge entre prix d’achat et prix de vente, multipliée par le nombre de ventes. Le capital tourne : il est réinvesti à chaque réapprovisionnement.',
    startingCapital: 'Modulable : on peut tester avec un petit stock avant d’ouvrir un point de vente.',
    skills: ['Connaissance du marché', 'Négociation fournisseurs', 'Gestion de stock et de caisse', 'Marketing'],
    riskLevel: 4,
    horizon: 'Court à moyen terme',
    liquidity: 'Moyenne : le stock se vend plus ou moins vite.',
    costs: 'Loyer, transport, emballage, taxes et patentes, invendus, crédit accordé aux clients.',
    returnPotential: 'Dépend de la marge et du volume de ventes ; très variable d’une activité à l’autre.',
    lossRisks: 'Invendus, vols, clients qui ne paient pas, mélange entre caisse du commerce et argent personnel.',
    example: 'Une commerçante teste un nouveau produit avec un petit stock, note chaque vente, et ne réassortit qu’après avoir calculé sa marge réelle.',
    sources: [OHADA],
    infoNature: 'mixte',
  },
  {
    slug: 'transport-logistique',
    name: 'Transport et logistique',
    icon: 'truck',
    summary: 'Taxi, moto-taxi, livraison, camion : des revenus quotidiens, un actif qui s’use vite.',
    description: 'Acheter un véhicule (moto, voiture, tricycle, camion) exploité directement ou confié à un chauffeur, ou proposer des services de livraison.',
    howItWorks: 'Le véhicule génère des recettes journalières ou des versements fixes du chauffeur. Il faut déduire carburant, entretien, assurances et amortissement du véhicule.',
    startingCapital: 'D’une moto à un camion : de quelques centaines de milliers à plusieurs dizaines de millions de FCFA.',
    skills: ['Gestion de flotte', 'Choix et suivi des chauffeurs', 'Mécanique de base', 'Réglementation des transports'],
    riskLevel: 4,
    horizon: 'Moyen terme (durée de vie du véhicule)',
    liquidity: 'Moyenne : un véhicule se revend, avec décote.',
    costs: 'Assurance, documents administratifs, carburant, pannes, pièces, amortissement.',
    returnPotential: 'Recettes régulières si le véhicule tourne et que le chauffeur est fiable ; à comparer à l’usure.',
    lossRisks: 'Accident, vol, pannes coûteuses, chauffeur qui ne reverse pas les recettes, changement de réglementation.',
    example: 'Un investisseur signe un contrat écrit avec son chauffeur (versement, entretien, assurance) et met de côté chaque mois une provision pour le remplacement du véhicule.',
    sources: [OHADA],
    infoNature: 'mixte',
  },
  {
    slug: 'energies-renouvelables',
    name: 'Énergies renouvelables',
    icon: 'sun',
    summary: 'Kits solaires, installation, maintenance : un besoin fort d’électricité, une technique à maîtriser.',
    description: 'Vendre, installer ou louer des équipements solaires (kits domestiques, pompes, systèmes pour commerces), ou investir dans ses propres panneaux pour réduire ses factures.',
    howItWorks: 'Revenus par la vente et l’installation, ou par le paiement échelonné des clients. Pour un particulier, l’économie sur les factures ou le groupe électrogène constitue le « rendement ».',
    startingCapital: 'Variable : un kit domestique reste accessible ; une activité d’installation demande du stock et des outils.',
    skills: ['Compétences techniques en électricité', 'Dimensionnement des installations', 'Service après-vente'],
    riskLevel: 3,
    horizon: 'Moyen à long terme',
    liquidity: 'Faible une fois l’équipement installé.',
    costs: 'Batteries à remplacer, maintenance, garanties, transport du matériel.',
    returnPotential: 'Dépend de la qualité du matériel, du prix de l’électricité évitée et de la solvabilité des clients.',
    lossRisks: 'Matériel contrefait ou de mauvaise qualité, impayés en vente à crédit, installation mal dimensionnée.',
    example: 'Un commerçant installe un système solaire pour son congélateur et compare chaque mois ses dépenses de carburant avant et après.',
    sources: [IRENA],
    infoNature: 'mixte',
  },
  {
    slug: 'technologie-numerique',
    name: 'Technologie et numérique',
    icon: 'cpu',
    summary: 'Services numériques, applications, e-commerce : faible capital matériel, fort besoin de compétences.',
    description: 'Créer ou financer des services numériques : développement web, marketing digital, applications, plateformes, cybercafé, réparation de téléphones.',
    howItWorks: 'Les revenus viennent de prestations, d’abonnements ou de commissions. Le principal capital est la compétence et le temps.',
    startingCapital: 'Souvent faible (ordinateur, connexion) pour une activité de services ; élevé pour une startup qui recrute.',
    skills: ['Compétences techniques', 'Vente de services', 'Gestion de projet', 'Veille'],
    riskLevel: 4,
    horizon: 'Moyen terme',
    liquidity: 'Faible pour une part dans une entreprise non cotée.',
    costs: 'Matériel, internet, électricité, logiciels, publicité.',
    returnPotential: 'Potentiellement élevé pour les projets qui trouvent leur marché, mais la majorité des startups échouent.',
    lossRisks: 'Échec commercial, dépendance à quelques clients, concurrence rapide, perte totale de la mise dans une startup.',
    example: 'Une graphiste commence en freelance avec son ordinateur, puis réinvestit ses premiers revenus dans une formation et un portfolio.',
    sources: [OHADA],
    infoNature: 'mixte',
  },
  {
    slug: 'marches-financiers',
    name: 'Marchés financiers (actions)',
    icon: 'line-chart',
    summary: 'Devenir actionnaire de sociétés cotées à la BRVM ou à la BVMAC via un intermédiaire agréé.',
    description: 'Acheter des actions de sociétés cotées, par exemple à la Bourse Régionale des Valeurs Mobilières (UEMOA) ou à la Bourse des Valeurs Mobilières de l’Afrique Centrale (CEMAC).',
    howItWorks: 'On ouvre un compte auprès d’une Société de Gestion et d’Intermédiation (SGI) agréée. Les revenus potentiels : dividendes et plus-values. Le cours des actions varie chaque jour.',
    startingCapital: 'Accessible : on peut commencer avec quelques actions, selon les conditions de la SGI.',
    skills: ['Lecture des résultats d’entreprises', 'Discipline', 'Diversification', 'Patience'],
    riskLevel: 4,
    horizon: 'Long terme (5 ans et plus)',
    liquidity: 'Moyenne : certaines actions s’échangent peu, la revente peut prendre du temps.',
    costs: 'Frais de courtage, droits de garde, éventuels frais de tenue de compte : à demander par écrit à la SGI.',
    returnPotential: 'Dividendes et plus-values possibles sur le long terme ; les performances passées ne préjugent pas des performances futures.',
    lossRisks: 'Baisse des cours, faible liquidité, faillite d’une société, intermédiaire non agréé.',
    example: 'Avant d’ouvrir un compte, vérifier que la SGI figure sur la liste des acteurs agréés publiée par le régulateur (AMF-UMOA ou COSUMAF).',
    sources: [BRVM, AMF, COSUMAF],
    infoNature: 'documente',
  },
  {
    slug: 'obligations',
    name: 'Obligations et titres publics',
    icon: 'scroll-text',
    summary: 'Prêter à un État ou une entreprise contre des intérêts : plus prévisible que les actions.',
    description: 'Une obligation est un prêt fait à un émetteur (État, entreprise) qui verse des intérêts et rembourse le capital à l’échéance. Les États de la zone émettent régulièrement des titres publics.',
    howItWorks: 'On souscrit lors d’une émission (souvent via une SGI ou une banque) ou on achète sur le marché secondaire. Les intérêts (coupons) sont versés à dates fixes.',
    startingCapital: 'Selon la valeur nominale des titres et les conditions de l’émission.',
    skills: ['Lecture d’une note d’information', 'Compréhension du risque de l’émetteur'],
    riskLevel: 2,
    horizon: 'Moyen à long terme (durée de l’obligation)',
    liquidity: 'Moyenne : revendre avant l’échéance n’est pas toujours facile.',
    costs: 'Frais de souscription ou de courtage selon l’intermédiaire.',
    returnPotential: 'Intérêts fixés à l’émission (voir la note d’information de chaque émission) ; rendement connu si l’on conserve jusqu’à l’échéance et que l’émetteur rembourse.',
    lossRisks: 'Défaut de l’émetteur, difficulté de revente avant l’échéance, inflation supérieure au taux.',
    example: 'Lire la note d’information d’un emprunt obligataire : émetteur, taux, durée, calendrier de remboursement, garanties.',
    sources: [UMOA_TITRES, BRVM, AMF, BCEAO, BEAC],
    infoNature: 'documente',
  },
  {
    slug: 'fonds-investissement',
    name: 'Fonds d’investissement (OPCVM)',
    icon: 'layers',
    summary: 'Confier son épargne à un gérant professionnel qui diversifie pour toi.',
    description: 'Les OPCVM (FCP, SICAV) regroupent l’épargne de nombreux investisseurs, gérée par une société de gestion agréée, sur un portefeuille diversifié (actions, obligations, monétaire).',
    howItWorks: 'On achète des parts du fonds ; leur valeur (valeur liquidative) évolue selon les actifs détenus. Certains fonds permettent des versements réguliers.',
    startingCapital: 'Souvent accessible ; le minimum dépend de chaque fonds.',
    skills: ['Lecture du prospectus', 'Comparaison des frais', 'Choix du profil de risque'],
    riskLevel: 3,
    horizon: 'Selon le fonds : court (monétaire) à long terme (actions)',
    liquidity: 'Bonne à moyenne selon les conditions de rachat du fonds.',
    costs: 'Frais d’entrée, frais de gestion annuels, frais de sortie : à comparer dans le prospectus.',
    returnPotential: 'Dépend de la composition du fonds ; aucun rendement n’est garanti sauf mention contractuelle explicite.',
    lossRisks: 'Baisse de la valeur des actifs du fonds, frais élevés qui réduisent la performance.',
    example: 'Comparer deux fonds : objectif, composition, frais annuels, durée de placement recommandée.',
    sources: [AMF, COSUMAF],
    infoNature: 'documente',
  },
  {
    slug: 'entrepreneuriat',
    name: 'Entrepreneuriat',
    icon: 'rocket',
    summary: 'Créer et développer sa propre entreprise : le plus fort potentiel… et le plus d’engagement.',
    description: 'Créer une entreprise formelle ou développer une activité existante : services, production, distribution.',
    howItWorks: 'Le capital finance le démarrage (équipement, stock, fonds de roulement). Les bénéfices rémunèrent l’entrepreneur et peuvent être réinvestis.',
    startingCapital: 'Très variable selon l’activité ; prévoir aussi un fonds de roulement pour tenir les premiers mois.',
    skills: ['Gestion', 'Vente', 'Comptabilité de base', 'Leadership', 'Résilience'],
    riskLevel: 5,
    horizon: 'Long terme',
    liquidity: 'Très faible : céder une entreprise est long.',
    costs: 'Formalités de création (variables selon le pays), impôts, salaires, loyers, comptabilité.',
    returnPotential: 'Potentiel élevé si l’entreprise trouve son marché ; revenus irréguliers les premières années.',
    lossRisks: 'Perte de la mise, endettement personnel, associés en conflit, mélange des finances personnelles et professionnelles.',
    example: 'Une entrepreneure se verse un « salaire » fixe chaque mois depuis le compte de son activité, et planifie ce salaire avec NexaFi.',
    sources: [OHADA],
    infoNature: 'mixte',
  },
  {
    slug: 'formation-competences',
    name: 'Formation et compétences',
    icon: 'graduation-cap',
    summary: 'Investir en soi : souvent le meilleur rapport risque / rendement à long terme.',
    description: 'Financer une formation, une certification ou l’apprentissage d’un métier qui augmente tes revenus futurs ou ouvre de nouvelles opportunités.',
    howItWorks: 'Le « rendement » se mesure par la hausse de revenus ou l’accès à de nouvelles activités après la formation.',
    startingCapital: 'De gratuit (ressources en ligne) à plusieurs centaines de milliers de FCFA ou plus (certifications, diplômes).',
    skills: ['Discipline', 'Choix d’une formation reconnue', 'Mise en pratique'],
    riskLevel: 2,
    horizon: 'Moyen à long terme',
    liquidity: 'Non revendable, mais la compétence reste acquise.',
    costs: 'Frais d’inscription, matériel, temps (revenus éventuellement perdus pendant la formation).',
    returnPotential: 'Dépend de la demande du marché pour la compétence ; à vérifier avant de s’inscrire (débouchés, témoignages d’anciens).',
    lossRisks: 'Formation non reconnue, organisme frauduleux, compétence peu demandée.',
    example: 'Avant de payer une formation, demander les taux d’insertion des anciens élèves et vérifier la reconnaissance du diplôme.',
    sources: [],
    infoNature: 'hypothese',
  },
];
