import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Mentions légales & Politique de confidentialité',
  description: 'Conditions Générales d\'Utilisation et Politique de confidentialité de BinlinPad.',
};

const LAST_UPDATED = '25 août 2025';
const APP_URL = 'https://cake-alpha-seven.vercel.app';
const CONTACT_EMAIL = 'gedenedavid@gmail.com';

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <div className="border-b border-[#E8E4DF] bg-white">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#F4A236] font-bold text-lg">
            📚 BinlinPad
          </Link>
          <span className="text-xs text-[#9B9590]">Dernière mise à jour : {LAST_UPDATED}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-16">

        {/* Navigation interne */}
        <div className="bg-white border border-[#E8E4DF] rounded-2xl p-5">
          <p className="text-xs font-semibold text-[#9B9590] uppercase tracking-wider mb-3">Sur cette page</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ['#cgu', 'Conditions d\'utilisation'],
              ['#donnees', 'Données personnelles'],
              ['#ia', 'Utilisation de l\'IA'],
              ['#droits', 'Vos droits'],
              ['#cookies', 'Cookies & Analytics'],
              ['#contact', 'Contact'],
            ].map(([href, label]) => (
              <a key={href} href={href} className="text-[#F4A236] hover:underline">
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* ── CGU ─────────────────────────────────────────────────────────────── */}
        <section id="cgu" className="space-y-6">
          <h1 className="text-2xl font-bold text-[#1A1A1A]">
            Conditions Générales d&apos;Utilisation
          </h1>

          <Block title="1. Présentation du service">
            <p>
              BinlinPad est une application web d&apos;aide aux études destinée aux élèves du système scolaire ivoirien
              (primaire, collège, lycée) et aux étudiants du supérieur. Elle est accessible à l&apos;adresse{' '}
              <a href={APP_URL} className="text-[#F4A236] hover:underline">{APP_URL}</a>.
            </p>
            <p>
              BinlinPad est édité par David Gedene, développeur indépendant, joignable à{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#F4A236] hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </Block>

          <Block title="2. Acceptation des conditions">
            <p>
              L&apos;utilisation de BinlinPad implique l&apos;acceptation pleine et entière des présentes conditions.
              Si vous n&apos;acceptez pas ces conditions, vous ne devez pas utiliser le service.
            </p>
            <p>
              L&apos;utilisation par un mineur (moins de 16 ans) doit être effectuée avec le consentement
              d&apos;un parent ou tuteur légal.
            </p>
          </Block>

          <Block title="3. Description du service">
            <p>BinlinPad vous permet de :</p>
            <ul>
              <li>Prendre et organiser des notes de cours par matière</li>
              <li>Interroger un tuteur IA basé sur vos propres notes</li>
              <li>Visualiser vos connaissances sous forme de graphe interactif</li>
              <li>Tenir un journal d&apos;humeur personnel et privé</li>
              <li>Demander volontairement à être mis en contact avec un conseiller</li>
            </ul>
          </Block>

          <Block title="4. Compte utilisateur">
            <p>
              La création d&apos;un compte est nécessaire pour accéder au service. Vous êtes responsable
              de la confidentialité de vos identifiants. Toute activité effectuée depuis votre compte
              est sous votre responsabilité.
            </p>
            <p>
              Nous nous réservons le droit de suspendre ou supprimer un compte en cas d&apos;utilisation
              abusive, de violation des présentes conditions, ou de comportement nuisant à d&apos;autres utilisateurs.
            </p>
          </Block>

          <Block title="5. Utilisation acceptable">
            <p>Vous vous engagez à ne pas :</p>
            <ul>
              <li>Utiliser le service à des fins illégales ou frauduleuses</li>
              <li>Tenter d&apos;accéder aux données d&apos;autres utilisateurs</li>
              <li>Soumettre des contenus offensants, haineux ou portant atteinte à des tiers</li>
              <li>Automatiser des requêtes vers le service de manière abusive</li>
              <li>Contourner les mécanismes de sécurité du service</li>
            </ul>
          </Block>

          <Block title="6. Disponibilité du service">
            <p>
              BinlinPad est fourni &quot;tel quel&quot;, sans garantie de disponibilité continue.
              Des interruptions peuvent survenir pour maintenance ou en cas d&apos;incident technique.
              Nous ne saurions être tenus responsables des pertes de données liées à une interruption de service.
            </p>
          </Block>

          <Block title="7. Propriété intellectuelle">
            <p>
              Le code source de BinlinPad est publié sous licence MIT.
              Vos notes et contenus vous appartiennent entièrement — BinlinPad n&apos;en revendique aucun droit.
            </p>
          </Block>
        </section>

        <Divider />

        {/* ── Données personnelles ─────────────────────────────────────────────── */}
        <section id="donnees" className="space-y-6">
          <h2 className="text-2xl font-bold text-[#1A1A1A]">
            Politique de Confidentialité
          </h2>

          <Block title="8. Données collectées">
            <p>Lors de la création de votre compte, nous collectons :</p>
            <table>
              <thead>
                <tr><th>Donnée</th><th>Finalité</th><th>Stockage</th></tr>
              </thead>
              <tbody>
                <tr><td>Nom affiché</td><td>Identification dans l&apos;app</td><td>MongoDB Atlas</td></tr>
                <tr><td>Adresse email</td><td>Authentification</td><td>MongoDB Atlas</td></tr>
                <tr><td>Mot de passe (haché bcrypt)</td><td>Authentification</td><td>MongoDB Atlas — jamais en clair</td></tr>
                <tr><td>Avatar (si connexion Google)</td><td>Affichage profil</td><td>MongoDB Atlas</td></tr>
                <tr><td>Type de profil (élève/étudiant)</td><td>Personnalisation tuteur IA</td><td>MongoDB Atlas</td></tr>
              </tbody>
            </table>
            <p className="mt-3">Lors de l&apos;utilisation du service, nous stockons :</p>
            <table>
              <thead>
                <tr><th>Donnée</th><th>Finalité</th><th>Envoyée à des tiers ?</th></tr>
              </thead>
              <tbody>
                <tr><td>Vos notes (titre, contenu, matière)</td><td>Service de tutorat IA</td><td>Oui — sur demande explicite uniquement (voir §9)</td></tr>
                <tr><td>Humeur par note</td><td>Journal personnel</td><td><strong>Non — jamais</strong></td></tr>
                <tr><td>Historique de conversations</td><td>Continuité pédagogique</td><td>Oui — voir §9</td></tr>
                <tr><td>Préférences d&apos;affichage</td><td>Personnalisation UI</td><td>Non — stocké localement</td></tr>
              </tbody>
            </table>
          </Block>

          <Block title="9. Services tiers et transfert de données">
            <p>BinlinPad utilise les services tiers suivants :</p>
            <ul>
              <li>
                <strong>DeepSeek</strong> (IA tuteur) — reçoit uniquement : vos notes pertinentes à la question posée,
                le type de profil (élève/étudiant), et l&apos;historique récent de la conversation.
                Jamais votre email, nom, humeur ou données sensibles.
              </li>
              <li>
                <strong>Voyage AI</strong> — vectorise le texte de vos notes et questions pour la recherche sémantique.
              </li>
              <li>
                <strong>Qdrant Cloud</strong> — stocke les représentations vectorielles de vos notes et échanges,
                isolées par identifiant utilisateur.
              </li>
              <li>
                <strong>MongoDB Atlas</strong> — base de données principale, hébergée en Europe (AWS).
              </li>
              <li>
                <strong>Google OAuth</strong> — uniquement si vous choisissez la connexion Google.
                Données reçues : nom, email, avatar.
              </li>
              <li>
                <strong>Vercel Analytics</strong> — métriques de navigation anonymisées (pages vues, pays).
                Aucun cookie de tracking persistant.
              </li>
            </ul>
          </Block>

          <Block title="10. Durée de conservation">
            <ul>
              <li>Notes et compte : conservés jusqu&apos;à suppression par l&apos;utilisateur</li>
              <li>Historique de conversation vectorisé : maximum 12 mois (purge automatique)</li>
              <li>Sessions de conversation : conservées jusqu&apos;à suppression manuelle (max 20 affichées)</li>
            </ul>
          </Block>
        </section>

        <Divider />

        {/* ── IA ───────────────────────────────────────────────────────────────── */}
        <section id="ia" className="space-y-6">
          <h2 className="text-2xl font-bold text-[#1A1A1A]">Utilisation de l&apos;Intelligence Artificielle</h2>

          <Block title="11. Ce que l'IA voit et ne voit pas">
            <p>
              Le tuteur IA (BinlinPad) ne reçoit <strong>que les notes directement pertinentes</strong> à
              la question que vous posez — pas l&apos;intégralité de vos notes. Cette sélection est automatique
              et basée sur la similarité sémantique.
            </p>
            <p>
              <strong>L&apos;IA ne reçoit jamais :</strong> votre humeur, vos données personnelles identifiantes
              (email, nom), vos notes verrouillées par PIN, ni aucune donnée non liée à votre question.
            </p>
          </Block>

          <Block title="12. Mémoire conversationnelle">
            <p>
              BinlinPad conserve une mémoire de vos échanges passés (question + réponse) sous forme vectorisée
              pour assurer la continuité pédagogique sur le long terme. Ces données sont stockées dans Qdrant,
              isolées par utilisateur, et purgées automatiquement après 12 mois.
            </p>
            <p>
              Vous pouvez supprimer tout ou partie de cet historique depuis l&apos;interface de chat.
            </p>
          </Block>

          <Block title="13. Journal d'humeur — données 100% privées">
            <p>
              Le journal d&apos;humeur est un outil purement personnel. BinlinPad ne transmet jamais votre
              humeur à l&apos;IA, à des tiers, ou à tout autre système automatisé.
              Aucune alerte, aucun scoring, aucun diagnostic n&apos;est effectué à partir de votre humeur.
            </p>
          </Block>

          <Block title="14. Bouton « Je veux en parler »">
            <p>
              Ce bouton est activé <strong>uniquement par votre action volontaire</strong>. Il enregistre
              une demande de contact (votre identifiant + date) sans aucun contenu de note, humeur ou
              texte libre. L&apos;application ne déclenche jamais ce bouton automatiquement.
            </p>
            <p>
              Numéro d&apos;écoute permanent : <strong>SOS Amitié Côte d&apos;Ivoire — 27 22 22 63</strong>
            </p>
          </Block>
        </section>

        <Divider />

        {/* ── Droits ───────────────────────────────────────────────────────────── */}
        <section id="droits" className="space-y-6">
          <h2 className="text-2xl font-bold text-[#1A1A1A]">Vos droits</h2>

          <Block title="15. Droits sur vos données">
            <p>Conformément aux réglementations applicables, vous disposez des droits suivants :</p>
            <ul>
              <li><strong>Droit d&apos;accès</strong> — consultez toutes vos données depuis l&apos;application</li>
              <li><strong>Droit de rectification</strong> — modifiez vos notes et profil à tout moment</li>
              <li><strong>Droit de suppression</strong> — supprimez vos notes et conversations depuis l&apos;UI</li>
              <li><strong>Droit à la portabilité</strong> — exportez vos notes en JSON depuis les Paramètres</li>
              <li>
                <strong>Retrait du consentement IA</strong> — désactivez les fonctionnalités IA dans les
                Paramètres ; aucune donnée ne sera envoyée à DeepSeek ou Voyage AI
              </li>
            </ul>
            <p>
              Pour toute demande de suppression de compte ou d&apos;exercice de vos droits, contactez-nous à{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#F4A236] hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </Block>
        </section>

        <Divider />

        {/* ── Cookies ──────────────────────────────────────────────────────────── */}
        <section id="cookies" className="space-y-6">
          <h2 className="text-2xl font-bold text-[#1A1A1A]">Cookies & Analytics</h2>

          <Block title="16. Utilisation des cookies">
            <p>BinlinPad utilise uniquement :</p>
            <ul>
              <li>
                <strong>Cookie de session</strong> (NextAuth) — nécessaire à l&apos;authentification.
                Supprimé à la déconnexion.
              </li>
              <li>
                <strong>localStorage</strong> — stocke vos préférences d&apos;affichage localement.
                Jamais transmis à nos serveurs.
              </li>
              <li>
                <strong>Vercel Analytics</strong> — collecte des métriques de navigation anonymisées
                (pages vues, pays de connexion). Aucun identifiant persistant, aucun suivi inter-sessions.
              </li>
            </ul>
            <p>Aucun cookie publicitaire ou de tracking tiers n&apos;est utilisé.</p>
          </Block>
        </section>

        <Divider />

        {/* ── Contact ──────────────────────────────────────────────────────────── */}
        <section id="contact" className="space-y-4">
          <h2 className="text-2xl font-bold text-[#1A1A1A]">Contact</h2>
          <div className="bg-white border border-[#E8E4DF] rounded-2xl p-6 space-y-2">
            <p className="text-sm text-[#1A1A1A]"><strong>Éditeur :</strong> David Gedene</p>
            <p className="text-sm text-[#1A1A1A]">
              <strong>Email :</strong>{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#F4A236] hover:underline">{CONTACT_EMAIL}</a>
            </p>
            <p className="text-sm text-[#1A1A1A]">
              <strong>Application :</strong>{' '}
              <a href={APP_URL} className="text-[#F4A236] hover:underline">{APP_URL}</a>
            </p>
            <p className="text-sm text-[#9B9590]">Dernière mise à jour : {LAST_UPDATED}</p>
          </div>
        </section>

        {/* Back */}
        <div className="text-center pb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[#9B9590] hover:text-[#1A1A1A] transition-colors"
          >
            ← Retour à BinlinPad
          </Link>
        </div>

      </div>
    </div>
  );
}

// ─── Composants utilitaires ───────────────────────────────────────────────────

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#E8E4DF] rounded-2xl p-6 space-y-3">
      <h3 className="font-semibold text-[#1A1A1A] text-base">{title}</h3>
      <div className="text-sm text-[#57514C] leading-relaxed space-y-2 [&_ul]:list-none [&_ul]:space-y-1.5 [&_ul>li]:flex [&_ul>li]:gap-2 [&_ul>li]:before:content-['·'] [&_ul>li]:before:text-[#F4A236] [&_ul>li]:before:font-bold [&_table]:w-full [&_table]:text-xs [&_th]:text-left [&_th]:font-semibold [&_th]:text-[#9B9590] [&_th]:pb-2 [&_th]:border-b [&_th]:border-[#F5F3EF] [&_td]:py-1.5 [&_td]:pr-4 [&_td]:border-b [&_td]:border-[#F5F3EF] [&_td]:align-top">
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return <hr className="border-[#E8E4DF]" />;
}
