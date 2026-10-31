<?php

namespace App\Tests\Service;

use App\Entity\Couple;
use App\Entity\CoupleMember;
use App\Entity\CoupleMode;
use App\Entity\Expense;
use App\Entity\SplitMode;
use App\Entity\Transfer;
use App\Entity\User;
use App\Repository\ExpenseRepository;
use App\Repository\MonthClosureRepository;
use App\Repository\TransferRepository;
use App\Service\CoupleContextService;
use App\Service\MonthlyBalanceService;
use App\Service\ProrataWeightCalculator;
use App\Service\OverallBalanceService;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class OverallBalanceServiceTest extends TestCase
{
    private OverallBalanceService $service;
    private ExpenseRepository&MockObject $expenseRepository;
    private TransferRepository&MockObject $transferRepository;
    private MonthClosureRepository&MockObject $monthClosureRepository;
    private CoupleContextService&MockObject $coupleContextService;

    private User $userA;
    private User $userB;
    private Couple $couple;

    protected function setUp(): void
    {
        $this->expenseRepository = $this->createMock(ExpenseRepository::class);
        $this->transferRepository = $this->createMock(TransferRepository::class);
        $this->monthClosureRepository = $this->createMock(MonthClosureRepository::class);
        $this->coupleContextService = $this->createMock(CoupleContextService::class);

        $monthlyBalanceService = new MonthlyBalanceService(
            $this->expenseRepository,
            $this->monthClosureRepository,
            $this->coupleContextService,
            $this->transferRepository,
            new ProrataWeightCalculator()
        );

        $this->service = new OverallBalanceService(
            $monthlyBalanceService,
            $this->coupleContextService,
            $this->expenseRepository,
            $this->transferRepository,
            $this->monthClosureRepository
        );

        $this->userA = $this->createUser(1, 'Clara');
        $this->userB = $this->createUser(2, 'Julien');

        $this->couple = new Couple();
        $this->couple->setMode(CoupleMode::EQUAL);

        $this->coupleContextService->method('getMembers')->willReturn([
            $this->createMember($this->userA),
            $this->createMember($this->userB),
        ]);

        $this->monthClosureRepository->method('findByMonth')->willReturn(null);
        $this->monthClosureRepository->method('findAllByCouple')->willReturn([]);
    }

    public function testThreeMonthsOfOverpayingAddUp(): void
    {
        $months = [
            ['year' => 2026, 'month' => 1],
            ['year' => 2026, 'month' => 2],
            ['year' => 2026, 'month' => 3],
        ];

        // Each month: Clara advances 20000 split 50/50, so Julien owes her 10000
        $this->expenseRepository->method('findDistinctMonths')->willReturn($months);
        $this->expenseRepository->method('findByMonth')->willReturn([
            $this->createExpense($this->userA, 20000),
        ]);
        $this->transferRepository->method('findDistinctMonths')->willReturn([]);
        $this->transferRepository->method('findByMonth')->willReturn([]);

        $result = $this->service->calculateOverall($this->couple);

        $this->assertCount(3, $result->months);
        $this->assertEquals(60000, $result->totalCents);

        // Clara is owed 3 x 10000
        $this->assertEquals(30000, $result->members[0]->netDeltaCents);
        $this->assertEquals(-30000, $result->members[1]->netDeltaCents);

        $this->assertEquals(2, $result->settlement->fromUserId);
        $this->assertEquals(1, $result->settlement->toUserId);
        $this->assertEquals(30000, $result->settlement->amountCents);
    }

    public function testTransfersAreDeductedFromTheStandingDebt(): void
    {
        $months = [
            ['year' => 2026, 'month' => 1],
            ['year' => 2026, 'month' => 2],
        ];

        $this->expenseRepository->method('findDistinctMonths')->willReturn($months);
        $this->expenseRepository->method('findByMonth')->willReturn([
            $this->createExpense($this->userA, 20000),
        ]);
        $this->transferRepository->method('findDistinctMonths')->willReturn([]);

        // Julien wired 4000 back each month
        $this->transferRepository->method('findByMonth')->willReturn([
            $this->createTransfer($this->userB, $this->userA, 4000),
        ]);

        $result = $this->service->calculateOverall($this->couple);

        $this->assertEquals(8000, $result->transfersTotalCents);

        // Owed 2 x 10000, already received 2 x 4000
        $this->assertEquals(20000, $result->members[0]->deltaCents);
        $this->assertEquals(8000, $result->members[0]->transferredInCents);
        $this->assertEquals(12000, $result->members[0]->netDeltaCents);

        $this->assertEquals(12000, $result->settlement->amountCents);
    }

    public function testMonthsWithOnlyTransfersAreIncluded(): void
    {
        // No expense at all, Clara simply wired 5000 to Julien
        $this->expenseRepository->method('findDistinctMonths')->willReturn([]);
        $this->expenseRepository->method('findByMonth')->willReturn([]);
        $this->transferRepository->method('findDistinctMonths')->willReturn([
            ['year' => 2026, 'month' => 4],
        ]);
        $this->transferRepository->method('findByMonth')->willReturn([
            $this->createTransfer($this->userA, $this->userB, 5000),
        ]);

        $result = $this->service->calculateOverall($this->couple);

        $this->assertCount(1, $result->months);
        $this->assertEquals(0, $result->totalCents);

        // Clara paid ahead: Julien owes her back
        $this->assertEquals(5000, $result->members[0]->netDeltaCents);
        $this->assertEquals(2, $result->settlement->fromUserId);
        $this->assertEquals(5000, $result->settlement->amountCents);
    }

    public function testSquareCoupleHasNoSettlement(): void
    {
        $this->expenseRepository->method('findDistinctMonths')->willReturn([
            ['year' => 2026, 'month' => 1],
        ]);
        $this->expenseRepository->method('findByMonth')->willReturn([
            $this->createExpense($this->userA, 10000),
        ]);
        $this->transferRepository->method('findDistinctMonths')->willReturn([]);
        $this->transferRepository->method('findByMonth')->willReturn([
            $this->createTransfer($this->userB, $this->userA, 5000),
        ]);

        $result = $this->service->calculateOverall($this->couple);

        $this->assertEquals(0, $result->members[0]->netDeltaCents);
        $this->assertNull($result->settlement);
    }

    public function testMixedSplitModesAreAggregated(): void
    {
        $this->expenseRepository->method('findDistinctMonths')->willReturn([
            ['year' => 2026, 'month' => 1],
        ]);
        $this->expenseRepository->method('findByMonth')->willReturn([
            $this->createExpense($this->userA, 10000),
            $this->createExpense($this->userA, 4000, SplitMode::EQUAL),
            $this->createExpense($this->userA, 3000, SplitMode::FULL, $this->userB),
        ]);
        $this->transferRepository->method('findDistinctMonths')->willReturn([]);
        $this->transferRepository->method('findByMonth')->willReturn([]);

        $result = $this->service->calculateOverall($this->couple);

        $this->assertEquals(17000, $result->totalCents);
        $this->assertEquals(10000, $result->prorataTotalCents);
        $this->assertEquals(4000, $result->equalTotalCents);
        $this->assertEquals(3000, $result->directTotalCents);

        // Julien bears 5000 + 2000 + 3000 = 10000, all advanced by Clara
        $this->assertEquals(10000, $result->members[1]->targetCents);
        $this->assertEquals(3000, $result->members[1]->directTargetCents);
        $this->assertEquals(10000, $result->settlement->amountCents);
    }

    // Helper methods

    private function createUser(int $id, string $name): User
    {
        $user = new User();

        $reflection = new \ReflectionClass($user);
        $reflection->getProperty('id')->setValue($user, $id);

        $user->setDisplayName($name);
        $user->setEmail(strtolower($name) . '@test.com');

        return $user;
    }

    private function createMember(User $user): CoupleMember
    {
        $member = new CoupleMember();
        $member->setUser($user);

        return $member;
    }

    private function createExpense(
        User $paidBy,
        int $amountCents,
        SplitMode $splitMode = SplitMode::PRORATA,
        ?User $chargedTo = null
    ): Expense {
        $expense = new Expense();
        $expense->setCouple($this->couple);
        $expense->setPaidBy($paidBy);
        $expense->setAmountCents($amountCents);
        $expense->setCurrency('EUR');
        $expense->setTitle('Test expense');
        $expense->setCategory('test');
        $expense->setSpentAt(new \DateTimeImmutable('2026-01-15'));
        $expense->setSplitMode($splitMode);
        $expense->setChargedTo($chargedTo);

        return $expense;
    }

    private function createTransfer(User $from, User $to, int $amountCents): Transfer
    {
        $transfer = new Transfer();
        $transfer->setCouple($this->couple);
        $transfer->setFromUser($from);
        $transfer->setToUser($to);
        $transfer->setAmountCents($amountCents);
        $transfer->setCurrency('EUR');
        $transfer->setTransferredAt(new \DateTimeImmutable('2026-01-20'));

        return $transfer;
    }
}
