import type { IR35Answer, IR35Status } from '@/types/database'

export const IR35_QUESTIONS = [
  {
    number: 1,
    importance: 'HIGH' as const,
    label: 'Personal service',
    text: 'Do you control how and when you do the work?',
    outside_if: true,
  },
  {
    number: 2,
    importance: 'HIGH' as const,
    label: 'Substitution',
    text: 'Can you send a substitute to do the work?',
    outside_if: true,
  },
  {
    number: 3,
    importance: 'HIGH' as const,
    label: 'Mutuality of obligation',
    text: 'Is there an obligation for the client to offer and you to accept work?',
    outside_if: false,
  },
  {
    number: 4,
    importance: 'HIGH' as const,
    label: 'Control',
    text: 'Does the client control where and when you work?',
    outside_if: false,
  },
  {
    number: 5,
    importance: 'MED' as const,
    label: 'Equipment',
    text: 'Do you use your own equipment and tools?',
    outside_if: true,
  },
  {
    number: 6,
    importance: 'MED' as const,
    label: 'Exclusivity',
    text: 'Do you work for multiple clients simultaneously?',
    outside_if: true,
  },
  {
    number: 7,
    importance: 'MED' as const,
    label: 'Financial risk',
    text: 'Are you financially at risk if the project overruns or fails?',
    outside_if: true,
  },
  {
    number: 8,
    importance: 'MED' as const,
    label: 'Part and parcel',
    text: 'Is this contract for a fixed deliverable rather than ongoing employment?',
    outside_if: true,
  },
]

export function calculateIR35(answers: IR35Answer[]): IR35Status {
  const weights = { HIGH: 3, MED: 1 }

  let outsideScore = 0
  let totalWeight = 0

  answers.forEach((answer, index) => {
    const question = IR35_QUESTIONS[index]
    if (!question) return

    const weight = weights[answer.importance]
    totalWeight += weight

    const isOutside =
      (question.outside_if === true && answer.value === true) ||
      (question.outside_if === false && answer.value === false)

    if (isOutside) outsideScore += weight
  })

  const percentage = totalWeight > 0 ? outsideScore / totalWeight : 0

  if (percentage >= 0.7) return 'outside_ir35'
  if (percentage >= 0.4) return 'needs_review'
  return 'inside_ir35'
}

export function getIR35StatusLabel(status: IR35Status): string {
  switch (status) {
    case 'outside_ir35': return 'Outside IR35'
    case 'inside_ir35': return 'Inside IR35'
    case 'needs_review': return 'Needs review'
  }
}

export function getIR35StatusColor(status: IR35Status): string {
  switch (status) {
    case 'outside_ir35': return 'text-success-700 bg-success-50'
    case 'inside_ir35': return 'text-danger-700 bg-danger-50'
    case 'needs_review': return 'text-amber-700 bg-amber-100'
  }
}
