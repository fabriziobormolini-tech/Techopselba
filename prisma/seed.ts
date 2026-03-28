import { PrismaClient, CertificationStatus, PaymentOutcome } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

const airlines = [
  { code: 'FR', name: 'Ryanair', complianceScore: 53 },
  { code: 'U2', name: 'EasyJet', complianceScore: 61 },
  { code: 'LH', name: 'Lufthansa', complianceScore: 96 },
  { code: 'AZ', name: 'ITA Airways', complianceScore: 72 },
  { code: 'W6', name: 'Wizz Air', complianceScore: 48 },
  { code: 'VY', name: 'Vueling', complianceScore: 67 },
  { code: 'BA', name: 'British Airways', complianceScore: 89 },
  { code: 'KL', name: 'KLM', complianceScore: 91 },
]

async function main() {
  console.log('Seeding database...')

  for (const airline of airlines) {
    const totalCerts = Math.floor(Math.random() * 200) + 50
    const validClaims = Math.floor(totalCerts * 0.92)
    const paidClaims = Math.floor(validClaims * (airline.complianceScore / 100))

    await prisma.airlineStats.upsert({
      where: { airlineCode: airline.code },
      update: {},
      create: {
        airlineCode: airline.code,
        airlineName: airline.name,
        totalCertifications: totalCerts,
        validClaims,
        paidClaims,
        partialPayments: Math.floor(paidClaims * 0.05),
        deniedClaims: validClaims - paidClaims,
        avgPaymentDays: Math.floor(Math.random() * 150) + 30,
        complianceScore: airline.complianceScore,
        lastUpdated: new Date(),
      },
    })
  }

  // Seed some sample certifications
  const sampleCerts = [
    {
      flightNumber: 'FR1234',
      flightDate: new Date('2025-03-15'),
      passengerEmail: createHash('sha256').update('passenger1@example.com').digest('hex'),
      airline: 'FR',
      route: 'FCO-LHR',
      distanceKm: 1434,
      delayHours: 4.5,
      delayReason: 'Technical issue',
      claimAmount: 250,
      validityScore: 94,
      confidence: 0.94,
      status: CertificationStatus.VALID,
      isPublic: true,
      blockchainHash: createHash('sha256').update('FR1234-2025-03-15-94').digest('hex'),
    },
    {
      flightNumber: 'U21567',
      flightDate: new Date('2025-02-20'),
      passengerEmail: createHash('sha256').update('passenger2@example.com').digest('hex'),
      airline: 'U2',
      route: 'MXP-BCN',
      distanceKm: 895,
      delayHours: 3.5,
      delayReason: 'Late aircraft',
      claimAmount: 250,
      validityScore: 88,
      confidence: 0.88,
      status: CertificationStatus.VALID,
      isPublic: true,
      blockchainHash: createHash('sha256').update('U21567-2025-02-20-88').digest('hex'),
    },
    {
      flightNumber: 'LH2890',
      flightDate: new Date('2025-01-10'),
      passengerEmail: createHash('sha256').update('passenger3@example.com').digest('hex'),
      airline: 'LH',
      route: 'MUC-JFK',
      distanceKm: 7700,
      delayHours: 5.0,
      delayReason: 'Crew shortage',
      claimAmount: 600,
      validityScore: 97,
      confidence: 0.97,
      status: CertificationStatus.VALID,
      isPublic: true,
      blockchainHash: createHash('sha256').update('LH2890-2025-01-10-97').digest('hex'),
    },
  ]

  for (const cert of sampleCerts) {
    await prisma.certification.create({
      data: {
        ...cert,
        paidAt: new Date(),
        feedbacks: {
          create: [
            {
              outcome: PaymentOutcome.PAID_FULL,
              daysToPay: Math.floor(Math.random() * 60) + 10,
            },
          ],
        },
      },
    })
  }

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
