import Link from 'next/link'
import LegalLayout from '@/components/legal-layout'

export const metadata = {
  title: 'Privacy Policy — Freelax by Britnova',
  description: 'How Freelax by Britnova collects, uses, and protects your personal data under UK GDPR.',
}

const UPDATED = '9 May 2026'

const TOC = [
  { id: 'who-we-are',         label: '1. Who we are' },
  { id: 'what-we-collect',    label: '2. What data we collect' },
  { id: 'how-we-use',         label: '3. How we use your data' },
  { id: 'legal-basis',        label: '4. Legal basis' },
  { id: 'automated-decisions', label: '4a. Automated decision making' },
  { id: 'storage-security',   label: '5. Storage & security' },
  { id: 'retention',          label: '6. Data retention' },
  { id: 'sharing',            label: '7. Sharing your data' },
  { id: 'your-rights',        label: '8. Your rights' },
  { id: 'cookies',            label: '9. Cookies' },
  { id: 'children',           label: '10. Children' },
  { id: 'changes',            label: '11. Changes to this policy' },
  { id: 'complaints',         label: '12. Complaints' },
]

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 80 }}>
      <h2 style={{
        fontSize: 19, fontWeight: 700, color: '#0F172A',
        letterSpacing: '-0.015em', margin: '0 0 12px',
      }}>
        {title}
      </h2>
      <div style={{ fontSize: 15, color: '#334155', lineHeight: 1.75 }}>
        {children}
      </div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Privacy Policy"
      subtitle="How Freelax by Britnova collects, uses, stores, and protects your personal data — in plain English, compliant with UK GDPR."
      updated={UPDATED}
      toc={TOC}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>

        <Section id="who-we-are" title="1. Who we are">
          <p style={{ margin: 0 }}>
            Freelax by Britnova is a financial management tool for UK freelancers, operated from the United Kingdom. For the purposes of UK GDPR, we are the data controller. Our registered address is 89 Brassett Point, London, E15 3LB. We are registered with the Information Commissioner&rsquo;s Office (ICO) — registration number ZC142915. You can reach us at{' '}
            <a href="mailto:support@freelax.co.uk" style={{ color: '#1D6B35', textDecoration: 'none', fontWeight: 500 }}>support@freelax.co.uk</a>.
          </p>
        </Section>

        <Section id="what-we-collect" title="2. What data we collect">
          <p style={{ margin: 0 }}>
            We collect the following categories of personal data:
          </p>
          <ul style={{ margin: '10px 0 0', paddingLeft: 20, lineHeight: 1.8 }}>
            <li><strong>Account information</strong> — name, email address, password hash</li>
            <li><strong>Business information</strong> — business name, address, VAT number, UTR</li>
            <li><strong>Financial data</strong> — invoices, expenses, income figures you enter</li>
            <li><strong>Usage data</strong> — pages visited, features used, browser and device type</li>
            <li><strong>Communication records</strong> — if you contact our support team</li>
            <li><strong>Tax identifiers</strong> — UTR and NINO, collected when you connect your HMRC account via Making Tax Digital</li>
            <li><strong>HMRC connection data</strong> — encrypted OAuth tokens when you connect your HMRC account via Making Tax Digital. We do not store your Government Gateway username or password.</li>
          </ul>
        </Section>

        <Section id="how-we-use" title="3. How we use your data">
          <p style={{ margin: 0 }}>
            We use your data to provide and improve the Freelax by Britnova service, calculate tax estimates based on the information you supply, send transactional emails (invoice confirmations, payment notifications, account alerts), and respond to support requests. <strong>We do not use your data for advertising or sell it to third parties under any circumstances.</strong>
          </p>
        </Section>

        <Section id="legal-basis" title="4. Legal basis for processing">
          <p style={{ margin: 0 }}>
            We process your data on the following legal bases under UK GDPR:
          </p>
          <ul style={{ margin: '10px 0 0', paddingLeft: 20, lineHeight: 1.8 }}>
            <li><strong>Contractual necessity</strong> — to provide the service you signed up for</li>
            <li><strong>Legitimate interests</strong> — to improve the service, prevent fraud, and ensure network and information security</li>
            <li><strong>Legal obligation</strong> — to comply with UK law where applicable</li>
            <li><strong>Consent</strong> — for non-essential communications, where we ask for your permission</li>
          </ul>
        </Section>

        <Section id="automated-decisions" title="4a. Automated decision making">
          <p style={{ margin: 0 }}>
            We use automated processing to generate tax estimates and IR35 assessments. These outputs are indicative only and do not constitute legally binding decisions. You should always verify figures with a qualified accountant before filing a tax return.
          </p>
        </Section>

        <Section id="storage-security" title="5. Storage and security">
          <p style={{ margin: 0 }}>
            Your data is stored on servers located in the United Kingdom via Supabase. All data is encrypted at rest and in transit using industry-standard encryption. We implement access controls, audit logging, and regular security reviews. For more detail see our{' '}
            <Link href="/security" style={{ color: '#1D6B35', textDecoration: 'none', fontWeight: 500 }}>Security page</Link>.
          </p>
        </Section>

        <Section id="retention" title="6. Data retention">
          <p style={{ margin: 0 }}>
            We retain your account data for as long as your account is active. If you delete your account, we will erase your personal data within <strong>30 days</strong>, except where we are required to retain it for legal or regulatory purposes. Certain financial records may be retained for up to 6 years where required by UK law, including the Companies Act 2006, even after account deletion.
          </p>
        </Section>

        <Section id="sharing" title="7. Sharing your data">
          <p style={{ margin: 0 }}>
            We share data only with the following third-party processors who are necessary to operate the service:
          </p>
          <ul style={{ margin: '10px 0 0', paddingLeft: 20, lineHeight: 1.8 }}>
            <li><strong>Supabase</strong> — database and authentication</li>
            <li><strong>Vercel</strong> — application hosting</li>
            <li><strong>Stripe</strong> — payment processing</li>
            <li><strong>Resend</strong> — transactional email delivery</li>
            <li><strong>Anthropic</strong> — AI features (tax Q&amp;A, expense scanning, IR35 assessments). Anthropic is based in the United States. Data transferred to Anthropic is protected under the UK-US data bridge adequacy framework.</li>
            <li><strong>HMRC</strong> — when you connect your HMRC account via Making Tax Digital, we store encrypted OAuth tokens to submit tax data on your behalf. We do not store your Government Gateway credentials.</li>
          </ul>
          <p style={{ margin: '12px 0 0' }}>
            Each processor is contractually bound to process your data only as instructed and in accordance with UK GDPR.
          </p>
        </Section>

        <Section id="your-rights" title="8. Your rights">
          <p style={{ margin: 0 }}>
            Under UK GDPR you have the right to:
          </p>
          <ul style={{ margin: '10px 0 0', paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Restrict or object to processing</li>
            <li>Port your data to another provider</li>
          </ul>
          <p style={{ margin: '12px 0 0' }}>
            You can download a complete copy of your data at any time from <strong>Settings → Export your data</strong>. To exercise any other rights, email{' '}
            <a href="mailto:support@freelax.co.uk" style={{ color: '#1D6B35', textDecoration: 'none', fontWeight: 500 }}>support@freelax.co.uk</a>. We will respond within 30 days. Where we rely on your consent to process data, you may withdraw it at any time by contacting{' '}
            <a href="mailto:support@freelax.co.uk" style={{ color: '#1D6B35', textDecoration: 'none', fontWeight: 500 }}>support@freelax.co.uk</a> — withdrawal does not affect the lawfulness of processing carried out before withdrawal.
          </p>
        </Section>

        <Section id="cookies" title="9. Cookies">
          <p style={{ margin: 0 }}>
            Freelax by Britnova uses <strong>strictly necessary cookies</strong> to maintain your login session. We do not use advertising or tracking cookies. You can delete cookies at any time through your browser settings, though this will log you out of your account.
          </p>
        </Section>

        <Section id="children" title="10. Children">
          <p style={{ margin: 0 }}>
            Freelax by Britnova is not intended for anyone under the age of 18. We do not knowingly collect personal data from children. If you believe a child has provided us with their data, please contact us and we will delete it promptly.
          </p>
        </Section>

        <Section id="changes" title="11. Changes to this policy">
          <p style={{ margin: 0 }}>
            We may update this policy to reflect changes in our practices or applicable law. We will notify you of material changes by email. Continued use of the service after notification constitutes acceptance. In the event of a data breach affecting your personal data, we will notify you and the ICO without undue delay and within 72 hours as required by UK GDPR.
          </p>
        </Section>

        <Section id="complaints" title="12. Complaints">
          <p style={{ margin: 0 }}>
            If you are unhappy with how we handle your data, you have the right to lodge a complaint with the Information Commissioner&rsquo;s Office (ICO) at{' '}
            <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" style={{ color: '#1D6B35', textDecoration: 'none', fontWeight: 500 }}>ico.org.uk</a>.
          </p>
        </Section>

      </div>
    </LegalLayout>
  )
}
