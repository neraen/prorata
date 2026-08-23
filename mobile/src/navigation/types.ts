export type RootStackParamList = {
  Login: undefined
  Register: undefined
  Setup: undefined
  Main: undefined
}

export type TabParamList = {
  Dashboard: undefined
  Expenses: undefined
  History: undefined
  Settings: undefined
}

export type ExpensesStackParamList = {
  ExpensesList: undefined
  AddExpense: undefined
  EditExpense: { expenseId: number }
}

export type HistoryStackParamList = {
  HistoryList: undefined
  HistoryDetail: { year: number; month: number }
}