import LegalLayout from '@/components/legal-layout'

export const metadata = {
  title: 'Terms of Service — Freedesk',
  description: 'Terms that govern your use of Freedesk — a financial management tool for UK freelancers.',
}

const UPDATED = '22 April 2026'

const TOC = [
  { id: 'about',              label: '1. About Freedesk' },
  { id: 'eligibility',        label: '2. Eligibility' },
  { id: 'account',            label: '3. Your account' },
  { id: 'acceptable-use',     label: '4. Acceptable use' },
  { id: 'payments',           label: '5. Payments & subscriptions' },
  { id: 'privacy',            label: '6. Data & privacy' },
  { id: 'tax',                label: '7. Tax calculations' },
  { id: 'ip',                 label: '8. Intellectual property' },
  { id: 'liability',          label: '9. Limitation of liability' },
  { id: 'changes',            label: '10. Changes to terms' },
  { id: 'governing-law',      label: '11. Governing law' },
  { id: 'contact',            label: '12. Contact' },
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

export default function TermsPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Terms of Service"
      subtitle="The terms that govern your use of Freedesk. Plain-English where possible, legally binding where it matters."
      updated={UPDATED}
      toc={TOC}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>

        <Section id="about" title="1. About Freedesk">
          <p style={{ margin: 0 }}>
            Freedesk is a financial management tool for UK freelancers and sole traders. It helps you track invoices, expenses, and tax obligations. Freedesk is <strong>not a regulated financial adviser, accountant, or tax professional</strong>. Nothing in this service constitutes financial, tax, or legal advice.
          </p>
        </Section>

        <Section id="eligibility" title="2. Eligibility">
          <p style={{ margin: 0 }}>
            You must be at least 18 years old and resident in the United Kingdom to use Freedesk. By creating an account you confirm that the information you provide is accurate and that you have the legal capacity to enter into these terms.
          </p>
        </Section>

        <Section id="account" title="3. Your account">
          <p style={{ margin: 0 }}>
            You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. Notify us immediately at{' '}
            <a href="mailto:support@freedesk.co.uk" style={{ color: '#1D6B35', textDecoration: 'none', fontWeight: 500 }}>support@freedesk.co.uk</a>{' '}
            if you suspect unauthorised access. We reserve the right to suspend or terminate accounts that violate these terms.
          </p>
        </Section>

        <Section id="acceptable-use" title="4. Acceptable use">
          <p style={{ margin: 0 }}>
            You agree not to use Freedesk to:
          </p>
          <ul style={{ margin: '10px 0 0', paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Submit false or misleading financial information</li>
            <li>Attempt to reverse-engineer or circumvent the platform</li>
            <li>Upload malicious code or content</li>
            <li>Use the service for any unlawful purpose</li>
          </ul>
          <p style={{ margin: '12px 0 0' }}>
            We reserve the right to remove content or suspend accounts that breach these conditions.
          </p>
        </Section>

        <Section id="payments" title="5. Payments and subscriptions">
          <p style={{ margin: 0 }}>
            Freedesk offers a free tier and paid subscription plans. Paid plans are billed monthly or annually via <strong>Stripe</strong>. You may cancel your subscription at any time; cancellation takes effect at the end of your current billing period. We do not offer refunds for partial periods except where required by UK consumer law.
          </p>
        </Section>

        <Section id="privacy" title="6. Data and privacy">
          <p style={{ margin: 0 }}>
            We collect and process personal data in accordance with our{' '}
            <a href="/privacy" style={{ color: '#1D6B35', textDecoration: 'none', fontWeight: 500 }}>Privacy Policy</a>{' '}
            and the UK GDPR. Your financial data is encrypted at rest and in transit. We do not sell your data to third parties or use it for advertising purposes.
          </p>
        </Section>

        <Section id="tax" title="7. Tax calculations">
          <p style={{ margin: 0 }}>
            Freedesk&rsquo;s tax estimates are based on publicly available HMRC rates and general assumptions about your circumstances. They are <strong>indicative only</strong> and may not reflect your actual tax liability. Always verify your figures with a qualified accountant before filing a tax return.
          </p>
        </Section>

        <Section id="ip" title="8. Intellectual property">
          <p style={{ margin: 0 }}>
            All content, design, and software in Freedesk is owned by or licensed to us. You may not copy, modify, or redistribute any part of the service without written permission.
          </p>
        </Section>

        <Section id="liability" title="9. Limitation of liability">
          <p style={{ margin: 0 }}>
            To the maximum extent permitted by UK law, Freedesk&rsquo;s total liability for any claim arising out of or relating to this service is limited to <strong>the amount you paid us in the 12 months preceding the claim</strong>. We are not liable for indirect, incidental, or consequential losses, including lost profits or data.
          </p>
        </Section>

        <Section id="changes" title="10. Changes to these terms">
          <p style={{ margin: 0 }}>
            We may update these terms from time to time. We will notify you of material changes by email or by displaying a notice in the app. Continued use of the service after notification constitutes acceptance of the updated terms.
          </p>
        </Section>

        <Section id="governing-law" title="11. Governing law">
          <p style={{ margin: 0 }}>
            These terms are governed by the laws of <strong>England and Wales</strong>. Any disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.
          </p>
        </Section>

        <Section id="contact" title="12. Contact">
          <p style={{ margin: 0 }}>
            Questions about these terms? Email{' '}
            <a href="mailto:support@freedesk.co.uk" style={{ color: '#1D6B35', textDecoration: 'none', fontWeight: 500 }}>support@freedesk.co.uk</a>.
          </p>
        </Section>

      </div>
    </LegalLayout>
  )
}
