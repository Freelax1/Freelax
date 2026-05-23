import LegalLayout from '@/components/legal-layout'
import {
  Lock, ShieldCheck, Globe, Database, CreditCard,
  Envelope, Key, FileText, Gear, UserCheck,
} from '@phosphor-icons/react/dist/ssr'

export const metadata = {
  title: 'Security — Freelax by Britnova',
  description: 'How Freelax by Britnova protects your financial data — encryption, compliance, infrastructure, and incident response.',
}

const UPDATED = '9 May 2026'

const TOC = [
  { id: 'encryption',     label: 'Data encryption' },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'access',         label: 'Access controls' },
  { id: 'compliance',     label: 'UK GDPR & compliance' },
  { id: 'location',       label: 'Data location' },
  { id: 'export',         label: 'Export & deletion' },
  { id: 'banking',        label: 'Bank details' },
  { id: 'incidents',      label: 'Incident response' },
  { id: 'contact',        label: 'Contact' },
]

// ── Visual primitives ───────────────────────────────────────────────
function TrustBadge({ Icon, title, sub }: { Icon: React.ElementType; title: string; sub: string }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(0,0,0,0.07)',
      borderRadius: 12, padding: '16px 18px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{
        width: 32, height: 32, flexShrink: 0,
        background: '#EAFAF0', color: '#1D6B35',
        borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon weight="regular" style={{ width: 16, height: 16 }} />
      </div>
      <div>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A', margin: 0, letterSpacing: '-0.005em' }}>
          {title}
        </p>
        <p style={{ fontSize: 12.5, color: '#64748B', margin: '2px 0 0', lineHeight: 1.45 }}>
          {sub}
        </p>
      </div>
    </div>
  )
}

function Section({ id, Icon, title, children }: {
  id: string; Icon: React.ElementType; title: string; children: React.ReactNode
}) {
  return (
    <section id={id} style={{ scrollMarginTop: 80 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 28, height: 28, flexShrink: 0,
          background: '#F1F5F9', color: '#0F172A',
          borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon weight="regular" style={{ width: 15, height: 15 }} />
        </div>
        <h2 style={{
          fontSize: 19, fontWeight: 700, color: '#0F172A',
          letterSpacing: '-0.015em', margin: 0,
        }}>
          {title}
        </h2>
      </div>
      <div style={{
        fontSize: 15, color: '#334155', lineHeight: 1.75,
        paddingLeft: 38,
      }}>
        {children}
      </div>
    </section>
  )
}

export default function SecurityPage() {
  const hero = (
    <div className="fd-security-badges" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: 12,
      maxWidth: 1000,
    }}>
      <TrustBadge Icon={Lock}       title="AES-256 at rest"      sub="All data encrypted with industry-standard keys" />
      <TrustBadge Icon={ShieldCheck} title="TLS 1.2+ in transit" sub="Every request secured end-to-end" />
      <TrustBadge Icon={FileText} title="SOC 2 Type II"         sub="Infrastructure via Supabase, independently audited" />
      <TrustBadge Icon={Globe}     title="UK only"                sub="Data stored in United Kingdom data centres" />
    </div>
  )

  return (
    <LegalLayout
      eyebrow="Trust & security"
      title="Your data is safe with us."
      subtitle="Freelax by Britnova protects your financial information with the same standards used by banks and enterprise SaaS — strong encryption, audited infrastructure, and strict access controls."
      updated={UPDATED}
      toc={TOC}
      hero={hero}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 44 }}>

        <Section id="encryption" Icon={Lock} title="Data encryption">
          <p style={{ margin: '0 0 12px' }}>
            Every byte you send to Freelax by Britnova is encrypted in transit using <strong>TLS 1.2 or higher</strong>. Once it reaches our infrastructure, it is encrypted at rest with <strong>AES-256</strong> — the same algorithm trusted by governments and the financial industry.
          </p>
          <p className="m-0">
            Database backups, file uploads (receipts, logos), and payment-related metadata inherit the same encryption. Encryption keys are managed and rotated by our hosting provider.
          </p>
        </Section>

        <Section id="infrastructure" Icon={Gear} title="Infrastructure">
          <p style={{ margin: '0 0 12px' }}>
            Freelax by Britnova is hosted on <strong>Supabase</strong> (database and auth) and <strong>Vercel</strong> (application layer). Both providers are <strong>SOC 2 Type II</strong> certified and maintain transparent, independently audited security controls.
          </p>
          <p className="m-0">
            Payment processing is handled exclusively by <strong>Stripe</strong>, which is <strong>PCI-DSS Level 1</strong> compliant — the highest tier of payment-card data security. Freelax by Britnova never stores your card details on our servers.
          </p>
        </Section>

        <Section id="access" Icon={Key} title="Access controls">
          <p style={{ margin: '0 0 12px' }}>
            Every row of your data is protected by database-level <strong>Row Level Security (RLS)</strong>. Another user cannot read, modify, or even detect your records — the database physically refuses to return them.
          </p>
          <p className="m-0">
            Internal access is limited to engineering staff on a strict need-to-know basis. Access to user data is restricted to authorised personnel only, on a strict need-to-know basis. All administrative actions are logged, reviewed, and require multi-factor authentication.
          </p>
        </Section>

        <Section id="compliance" Icon={ShieldCheck} title="UK GDPR & compliance">
          <p style={{ margin: '0 0 12px' }}>
            Freelax by Britnova is built for UK users and complies with the <strong>UK General Data Protection Regulation (UK GDPR)</strong> and the Data Protection Act 2018. Your data is processed lawfully, stored only as long as necessary, and <strong>never sold or shared with advertisers</strong>.
          </p>
          <p className="m-0">
            Under UK GDPR you have the right to access, correct, port, restrict, and delete your personal data. See the <a href="/privacy" style={{ color: '#1D6B35', textDecoration: 'none', fontWeight: 500 }}>Privacy Policy</a> for full details on your rights.
          </p>
        </Section>

        <Section id="location" Icon={Globe} title="Data location">
          <p className="m-0">
            Your data is stored in data centres within the <strong>United Kingdom</strong>. Freelax by Britnova does not transfer personal data outside the UK without appropriate safeguards — such as Standard Contractual Clauses and adequacy decisions — where such transfers are strictly necessary.
          </p>
        </Section>

        <Section id="export" Icon={Database} title="Export & deletion">
          <p style={{ margin: '0 0 12px' }}>
            You can export your full data at any time from <strong>Settings</strong>, or request a machine-readable copy by emailing{' '}
            <a href="mailto:support@freelax.co.uk" style={{ color: '#1D6B35', textDecoration: 'none', fontWeight: 500 }}>support@freelax.co.uk</a>.
          </p>
          <p className="m-0">
            Account deletion is a self-service action in <strong>Settings → Danger Zone</strong>. Deleted accounts and all associated personal data are erased within <strong>30 days</strong>, aligned with UK GDPR requirements.
          </p>
        </Section>

        <Section id="banking" Icon={CreditCard} title="Bank details">
          <p className="m-0">
            Any bank details you add are used <strong>solely for display on invoice PDFs</strong> you send to clients. Freelax by Britnova does not access your bank account, does not initiate payments, and does not share your banking information with any third party.
          </p>
        </Section>

        <Section id="incidents" Icon={UserCheck} title="Incident response">
          <p className="m-0">
            In the unlikely event of a security incident affecting your personal data, we will notify you and the <strong>Information Commissioner&rsquo;s Office (ICO)</strong> without undue delay and within <strong>72 hours</strong>, as required by UK GDPR. Our infrastructure providers monitor uptime and security events continuously. We follow a documented incident-response playbook and will notify affected users, the ICO, and <strong>HMRC</strong> within 72 hours of becoming aware of a breach.
          </p>
        </Section>

        <Section id="contact" Icon={Envelope} title="Contact">
          <p className="m-0">
            Questions about security, compliance, or data protection? Email{' '}
            <a href="mailto:support@freelax.co.uk" style={{ color: '#1D6B35', textDecoration: 'none', fontWeight: 500 }}>support@freelax.co.uk</a>. We aim to respond within two business days.
          </p>
          <p style={{ margin: '12px 0 0' }}>
            If you discover a security vulnerability in Freelax, please report it responsibly to{' '}
            <a href="mailto:support@freelax.co.uk" style={{ color: '#1D6B35', textDecoration: 'none', fontWeight: 500 }}>support@freelax.co.uk</a>. We will acknowledge receipt within two business days and work to resolve confirmed issues promptly. We ask that you do not publicly disclose vulnerabilities until we have had a reasonable opportunity to address them.
          </p>
        </Section>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .fd-security-badges { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </LegalLayout>
  )
}
