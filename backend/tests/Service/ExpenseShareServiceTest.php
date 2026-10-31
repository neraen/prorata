<?php

namespace App\Tests\Service;

use App\Entity\Couple;
use App\Entity\CoupleMember;
use App\Entity\CoupleMode;
use App\Entity\Expense;
use App\Entity\SplitMode;
use App\Entity\User;
use App\Repository\ExpenseRepository;
use App\Repository\MonthClosureRepository;
use App\Repository\TransferRepository;
use App\Service\CoupleContextService;
use App\Service\ExpenseShareService;
use App\Service\MonthlyBalanceService;
use App\Service\ProrataWeightCalculator;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class ExpenseShareServiceTest extends TestCase
{
    private ExpenseShareService $service;
    private CoupleContextService&MockObject $coupleContextService;

    private User $userA;
    private User $userB;

    protected function setUp(): void
    {
        $this->coupleContextService = $this->createMock(CoupleContextService::class);
        $this->service = new ExpenseShareService($this->coupleContextService, new ProrataWeightCalculator());

        $this->userA = $this->createUser(1, 'Clara');
        $this->userB = $this->createUser(2, 'Julien');
    }

    public function testProrataSharesFollowTheWeights(): void
    {
        $couple = $this->createCouple(CoupleMode::PERCENTAGE, 60, 40);

        $expenses = [
            $this->createExpense(1, 10000),
            $this->createExpense(2, 5000),
        ];

        $shares = $this->service->sharesFor($couple, $this->userA, $expenses);

        $this->assertEquals(6000, $shares[1]);
        $this->assertEquals(3000, $shares[2]);
    }

    public function testEqualExpensesAreHalvedWhateverTheWeights(): void
    {
        $couple = $this->createCouple(CoupleMode::PERCENTAGE, 70, 30);

        $expenses = [$this->createExpense(1, 10000, SplitMode::EQUAL)];

        $this->assertEquals(5000, $this->service->sharesFor($couple, $this->userA, $expenses)[1]);
        $this->assertEquals(5000, $this->service->sharesFor($couple, $this->userB, $expenses)[1]);
    }

    public function testFullExpenseGoesEntirelyToItsBearer(): void
    {
        $couple = $this->createCouple(CoupleMode::EQUAL);

        $expenses = [$this->createExpense(1, 8000, SplitMode::FULL, $this->userB)];

        $this->assertEquals(0, $this->service->sharesFor($couple, $this->userA, $expenses)[1]);
        $this->assertEquals(8000, $this->service->sharesFor($couple, $this->userB, $expenses)[1]);
    }

    public function testSharesOfBothMembersAddUpToEachExpense(): void
    {
        $couple = $this->createCouple(CoupleMode::PERCENTAGE, 33, 67);

        // Amounts chosen so every line has a rounding remainder
        $expenses = [
            $this->createExpense(1, 3333),
            $this->createExpense(2, 1111),
            $this->createExpense(3, 777),
        ];

        $sharesA = $this->service->sharesFor($couple, $this->userA, $expenses);
        $sharesB = $this->service->sharesFor($couple, $this->userB, $expenses);

        foreach ($expenses as $expense) {
            $this->assertEquals(
                $expense->getAmountCents(),
                $sharesA[$expense->getId()] + $sharesB[$expense->getId()],
                sprintf('Expense %d is fully allocated', $expense->getId())
            );
        }
    }

    /**
     * The per-line breakdown must reconcile with the month's balance, otherwise
     * the "Perso" total and the dashboard would disagree by a few cents.
     */
    public function testSharesSumToTheTargetOfTheMonthlyBalance(): void
    {
        $couple = $this->createCouple(CoupleMode::PERCENTAGE, 33, 67);

        $expenses = [
            $this->createExpense(1, 3333),
            $this->createExpense(2, 1111, SplitMode::EQUAL),
            $this->createExpense(3, 777, SplitMode::EQUAL),
            $this->createExpense(4, 999, SplitMode::FULL, $this->userB),
            $this->createExpense(5, 4567),
        ];

        $balance = $this->buildBalance($couple, $expenses);

        $sharesA = $this->service->sharesFor($couple, $this->userA, $expenses);
        $sharesB = $this->service->sharesFor($couple, $this->userB, $expenses);

        $this->assertEquals($balance->members[0]->targetCents, array_sum($sharesA));
        $this->assertEquals($balance->members[1]->targetCents, array_sum($sharesB));
    }

    public function testMemberAloneInTheCoupleBearsEverything(): void
    {
        $couple = new Couple();
        $couple->setMode(CoupleMode::EQUAL);

        $this->coupleContextService->method('getMembers')->willReturn([
            $this->createMember($this->userA),
        ]);

        $expenses = [$this->createExpense(1, 4500)];

        $this->assertEquals(4500, $this->service->sharesFor($couple, $this->userA, $expenses)[1]);
    }

    // Helper methods

    private function buildBalance(Couple $couple, array $expenses)
    {
        $expenseRepository = $this->createMock(ExpenseRepository::class);
        $expenseRepository->method('findByMonth')->willReturn($expenses);

        $monthClosureRepository = $this->createMock(MonthClosureRepository::class);
        $monthClosureRepository->method('findByMonth')->willReturn(null);

        $balanceService = new MonthlyBalanceService(
            $expenseRepository,
            $monthClosureRepository,
            $this->coupleContextService,
            $this->createMock(TransferRepository::class),
            new ProrataWeightCalculator()
        );

        return $balanceService->calculateBalance($couple, 2026, 2);
    }

    private function createCouple(CoupleMode $mode, ?int $pctA = null, ?int $pctB = null): Couple
    {
        $couple = new Couple();
        $couple->setMode($mode);

        $this->coupleContextService->method('getMembers')->willReturn([
            $this->createMember($this->userA, $pctA),
            $this->createMember($this->userB, $pctB),
        ]);

        return $couple;
    }

    private function createMember(User $user, ?int $percentage = null): CoupleMember
    {
        $member = new CoupleMember();
        $member->setUser($user);
        $member->setPercentage($percentage);

        return $member;
    }

    private function createUser(int $id, string $name): User
    {
        $user = new User();

        $reflection = new \ReflectionClass($user);
        $reflection->getProperty('id')->setValue($user, $id);

        $user->setDisplayName($name);
        $user->setEmail(strtolower($name) . '@test.com');

        return $user;
    }

    private function createExpense(
        int $id,
        int $amountCents,
        SplitMode $splitMode = SplitMode::PRORATA,
        ?User $chargedTo = null
    ): Expense {
        $expense = new Expense();

        $reflection = new \ReflectionClass($expense);
        $reflection->getProperty('id')->setValue($expense, $id);

        $expense->setPaidBy($this->userA);
        $expense->setAmountCents($amountCents);
        $expense->setCurrency('EUR');
        $expense->setTitle('Test expense');
        $expense->setCategory('test');
        $expense->setSpentAt(new \DateTimeImmutable('2026-02-15'));
        $expense->setSplitMode($splitMode);
        $expense->setChargedTo($chargedTo);

        return $expense;
    }
}
