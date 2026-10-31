<?php

namespace App\Service;

use App\DTO\Response\PersonalExpenseResponse;
use App\DTO\Response\PersonalMonthResponse;
use App\DTO\Response\SharedExpenseShareResponse;
use App\Entity\PersonalExpense;
use App\Entity\User;
use App\Repository\ExpenseRepository;
use App\Repository\PersonalExpenseRepository;

/**
 * Builds the "Perso" view of a month for one person: their own expenses, plus
 * the slice of the couple's expenses they bear.
 */
class PersonalMonthService
{
    public function __construct(
        private PersonalExpenseRepository $personalExpenseRepository,
        private ExpenseRepository $expenseRepository,
        private ExpenseShareService $expenseShareService,
        private CoupleContextService $coupleContextService
    ) {}

    public function buildMonth(User $user, int $year, int $month): PersonalMonthResponse
    {
        $personalExpenses = $this->personalExpenseRepository->findForMonth($user, $year, $month);

        $personal = array_map(
            fn(PersonalExpense $expense) => PersonalExpenseResponse::fromEntity($expense, $year, $month),
            $personalExpenses
        );

        $personalTotal = array_sum(array_map(
            fn(PersonalExpense $expense) => $expense->getAmountCents(),
            $personalExpenses
        ));

        $recurringTotal = array_sum(array_map(
            fn(PersonalExpense $expense) => $expense->isRecurring() ? $expense->getAmountCents() : 0,
            $personalExpenses
        ));

        [$shared, $sharedTotal] = $this->buildSharedShares($user, $year, $month);

        return PersonalMonthResponse::create(
            $year,
            $month,
            $this->resolveCurrency($personalExpenses),
            $personal,
            $shared,
            $personalTotal,
            $sharedTotal,
            $recurringTotal
        );
    }

    /**
     * @return array{SharedExpenseShareResponse[], int}
     */
    private function buildSharedShares(User $user, int $year, int $month): array
    {
        $couple = $this->coupleContextService->getCurrentCouple($user);

        if ($couple === null) {
            return [[], 0];
        }

        $expenses = $this->expenseRepository->findByMonth($couple, $year, $month);
        $shares = $this->expenseShareService->sharesFor($couple, $user, $expenses);

        $shared = [];
        $total = 0;

        foreach ($expenses as $expense) {
            $share = $shares[$expense->getId()] ?? 0;
            $shared[] = SharedExpenseShareResponse::fromEntity($expense, $share);
            $total += $share;
        }

        return [$shared, $total];
    }

    /**
     * @param PersonalExpense[] $personalExpenses
     */
    private function resolveCurrency(array $personalExpenses): string
    {
        return $personalExpenses === [] ? 'EUR' : $personalExpenses[0]->getCurrency();
    }
}
