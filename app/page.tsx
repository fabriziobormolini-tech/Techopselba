import Link from 'next/link'

const STATS = [
  { label: 'Claims Certified', value: '75+' },
  { label: 'Accuracy Rate', value: '94%' },
  { label: 'Passenger Trust', value: '68%' },
  { label: 'Revenue Generated', value: '€1,200' },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Upload Your Documents',
    description:
      'Upload your boarding pass and booking confirmation. Our OCR engine extracts all relevant flight data automatically.',
  },
  {
    step: '02',
    title: 'We Certify Your Claim',
    description:
      'Our EU261 rules engine assesses eligibility, calculates your compensation amount, and assigns a validity score.',
  },
  {
    step: '03',
    title: 'Public Certification Issued',
    description:
      'You receive a permanent, blockchain-anchored certification page you can share with the airline, press, or regulators.',
  },
  {
    step: '04',
    title: 'Airline Reputation on the Line',
    description:
      'Certified unpaid claims appear in our public compliance database — creating real social pressure for airlines to settle.',
  },
]

const WHY_DIFFERENT = [
  {
    icon: '⚖️',
    title: 'We Certify, Not Process',
    description:
      'We have no conflict of interest. We don\'t take a cut of your compensation — we simply certify that your claim is valid.',
  },
  {
    icon: '🔗',
    title: 'Blockchain-Backed Proof',
    description:
      'Each certification is hashed and anchored immutably. Airlines cannot dispute the date or content of our assessment.',
  },
  {
    icon: '📊',
    title: 'Compliance Database',
    description:
      'We track which airlines pay and which don\'t. Journalists, regulators, and lawyers cite our data.',
  },
  {
    icon: '🌐',
    title: 'Network Effects',
    description:
      'The more certifications we issue, the more powerful our database becomes. Every claim you certify strengthens everyone else\'s.',
  },
]

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 rounded-full px-4 py-1.5 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              Beta — 75 certifications issued
            </div>
            <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
              Your flight was delayed.<br />
              <span className="text-blue-600">We certify your claim is valid.</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Airlines ignore 40% of valid EU261 claims. Not because they can legally — but
              because passengers give up. We change the incentive: certified, public, permanent.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/submit" className="btn-primary text-base py-4 px-8">
                Certify My Claim — €25
              </Link>
              <Link href="/dashboard" className="btn-secondary text-base py-4 px-8">
                View Airline Rankings
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-400">
              94% accuracy · Blockchain-anchored · 68% of passengers pay
            </p>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-white">{s.value}</div>
                <div className="text-blue-200 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Airlines have no incentive to pay
            </h2>
            <div className="space-y-4 text-gray-600">
              <p>
                ENAC (Italy&apos;s aviation regulator) has <strong>100 staff</strong> and receives{' '}
                <strong>50,000 complaints/year</strong>. Airlines know enforcement is effectively nil.
              </p>
              <p>
                Existing claims services like AirHelp solve friction — they make it easier to submit.
                But they don&apos;t change the airline&apos;s incentive to pay fast.
              </p>
              <p>
                The result: the same 6–12 month wait, with 90% of passengers abandoning before resolution.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Claims ignored by airlines', value: '40%', color: 'text-red-600' },
              { label: 'Average time to resolution', value: '6–12 months', color: 'text-orange-600' },
              { label: 'Passengers who give up', value: '90%', color: 'text-red-600' },
              { label: 'Regulator staff per complaint', value: '0.002', color: 'text-orange-600' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-4 rounded-xl bg-white border border-gray-100 shadow-sm"
              >
                <span className="text-sm text-gray-600">{item.label}</span>
                <span className={`text-xl font-bold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-y border-gray-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">How certification works</h2>
            <p className="mt-3 text-gray-600">From upload to public proof in minutes</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="relative">
                <div className="text-5xl font-bold text-blue-100 mb-4">{step.step}</div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why different */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-gray-900">
            A new enforcement mechanism
          </h2>
          <p className="mt-3 text-gray-600">
            We don&apos;t process claims. We certify them — and make non-payment visible.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {WHY_DIFFERENT.map((item) => (
            <div key={item.title} className="card flex gap-5">
              <div className="text-3xl shrink-0">{item.icon}</div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to certify your claim?
          </h2>
          <p className="text-blue-100 mb-8">
            €25 — less than 5 minutes — permanent public proof.
          </p>
          <Link href="/submit" className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-white text-blue-600 font-semibold text-base hover:bg-blue-50 transition-colors">
            Get Certified Now
          </Link>
        </div>
      </section>
    </main>
  )
}
