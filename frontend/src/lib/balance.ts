import type { Expense, CoupleSettings, User, BalanceBreakdown, Settlement } from './types'

export function computeBalance(
  expenses: Expense[],
  settings: CoupleSettings,
  userA: User,
  userB: User
): BalanceBreakdown {
  const total = expenses.reduce((sum, e) => sum + e.amountCents, 0)

  let weightA: number
  switch (settings.mode) {
    case 'income':
      const incomeA = settings.incomeA || 0
      const incomeB = settings.incomeB || 0
      const totalIncome = incomeA + incomeB
      weightA = totalIncome > 0 ? incomeA / totalIncome : 0.5
      break
    case 'percentage':
      weightA = (settings.percentageA || 50) / 100
      break
    case 'equal':
    default:
      weightA = 0.5
  }

  const weightB = 1 - weightA
  const targetA = Math.round(total * weightA)
  const targetB = total - targetA

  const paidA = expenses
    .filter(e => e.paidByUserId === userA.id)
    .reduce((sum, e) => sum + e.amountCents, 0)
  const paidB = total - paidA

  const deltaA = paidA - targetA

  let settlement: Settlement | null = null
  if (deltaA > 0) {
    settlement = {
      fromUserId: userB.id,
      toUserId: userA.id,
      amount: deltaA,
    }
  } else if (deltaA < 0) {
    settlement = {
      fromUserId: userA.id,
      toUserId: userB.id,
      amount: Math.abs(deltaA),
    }
  }

  return {
    total,
    weightA,
    weightB,
    targetA,
    targetB,
    paidA,
    paidB,
    deltaA,
    settlement,
    userA,
    userB,
  }
}

export function getSettlementMessage(breakdown: BalanceBreakdown): string {
  if (!breakdown.settlement || breakdown.settlement.amount === 0) {
    return 'Vous êtes à l\'équilibre'
  }

  const fromUser = breakdown.settlement.fromUserId === breakdown.userA.id
    ? breakdown.userA
    : breakdown.userB
  const toUser = breakdown.settlement.toUserId === breakdown.userA.id
    ? breakdown.userA
    : breakdown.userB
  const amount = Math.round(breakdown.settlement.amount / 100)

  return `${fromUser.name} doit ${amount} € à ${toUser.name}`
}