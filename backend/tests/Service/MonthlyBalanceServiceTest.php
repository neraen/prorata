<?php

namespace App\Tests\Service;

use App\Entity\Couple;
use App\Entity\CoupleMember;
use App\Entity\CoupleMode;
use App\Entity\Expense;
use App\Entity\MonthClosure;
use App\Entity\SplitMode;
use App\Entity\Transfer;
use App\Entity\User;
use App\Repository\ExpenseRepository;
use App\Repository\MonthClosureRepository;
use App\Repository\TransferRepository;
use App\Service\CoupleContextService;
use App\Service\MonthlyBalanceService;
use App\Service\ProrataWeightCalculator;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class MonthlyBalanceServiceTest extends TestCase
{
    private MonthlyBalanceService $service;
    private ExpenseRepository&MockObject $expenseRepository;
    private MonthClosureRepository&MockObject $monthClosureRepository;
    private CoupleContextService&MockObject $coupleContextService;
    private TransferRepository&MockObject $transferRepository;

    protected function setUp(): void
    {
        $this->expenseRepository = $this->createMock(ExpenseRepository::class);
        $this->monthClosureRepository = $this->createMock(MonthClosureRepository::class);
        $this->coupleContextService = $this->createMock(CoupleContextService::class);
        $this->transferRepository = $this->createMock(TransferRepository::class);

        $this->service = new MonthlyBalanceService(
            $this->expenseRepository,
            $this->monthClosureRepository,
            $this->coupleContextService,
            $this->transferRepository,
            new ProrataWeightCalculator()
        );
    }

    public function testEqualMode5050(): void
    {
        // Setup users
        $userA = $this->createUser(1, 'Clara');
        $userB = $this->createUser(2, 'Julien');

        // Setup couple with equal mode
        $couple = new Couple();
        $couple->setMode(CoupleMode::EQUAL);

        $memberA = $this->createMember($userA);
        $memberB = $this->createMember($userB);

        // Setup expenses: Clara paid 6000, Julien paid 4000, total 10000
        $expenses = [
            $this->createExpense($couple, $userA, 6000),
            $this->createExpense($couple, $userB, 4000),
        ];

        $this->monthClosureRepository->method('findByMonth')->willReturn(null);
        $this->expenseRepository->method('findByMonth')->willReturn($expenses);
        $this->coupleContextService->method('getMembers')->willReturn([$memberA, $memberB]);

        // Calculate
        $result = $this->service->calculateBalance($couple, 2026, 2);

        // Assert
        $this->assertEquals(10000, $result->totalCents);
        $this->assertEquals('equal', $result->mode);
        $this->assertCount(2, $result->members);

        // Clara: weight 0.5, target 5000, paid 6000, delta +1000
        $this->assertEquals(0.5, $result->members[0]->weight);
        $this->assertEquals(5000, $result->members[0]->targetCents);
        $this->assertEquals(6000, $result->members[0]->paidCents);
        $this->assertEquals(1000, $result->members[0]->deltaCents);

        // Julien: weight 0.5, target 5000, paid 4000, delta -1000
        $this->assertEquals(0.5, $result->members[1]->weight);
        $this->assertEquals(5000, $result->members[1]->targetCents);
        $this->assertEquals(4000, $result->members[1]->paidCents);
        $this->assertEquals(-1000, $result->members[1]->deltaCents);

        // Settlement: Julien owes Clara 1000
        $this->assertNotNull($result->settlement);
        $this->assertEquals(2, $result->settlement->fromUserId);
        $this->assertEquals(1, $result->settlement->toUserId);
        $this->assertEquals(1000, $result->settlement->amountCents);
    }

    public function testIncomeMode6040WithRounding(): void
    {
        // Setup users
        $userA = $this->createUser(1, 'Clara');
        $userB = $this->createUser(2, 'Julien');

        // Setup couple with income mode
        $couple = new Couple();
        $couple->setMode(CoupleMode::INCOME);

        // Clara earns 2400€, Julien earns 1600€ -> 60/40 split
        $memberA = $this->createMember($userA, 240000, null);
        $memberB = $this->createMember($userB, 160000, null);

        // Total expenses: 21400 cents
        // Clara paid 10000, Julien paid 11400
        $expenses = [
            $this->createExpense($couple, $userA, 10000),
            $this->createExpense($couple, $userB, 11400),
        ];

        $this->monthClosureRepository->method('findByMonth')->willReturn(null);
        $this->expenseRepository->method('findByMonth')->willReturn($expenses);
        $this->coupleContextService->method('getMembers')->willReturn([$memberA, $memberB]);

        // Calculate
        $result = $this->service->calculateBalance($couple, 2026, 2);

        // Assert total
        $this->assertEquals(21400, $result->totalCents);
        $this->assertEquals('income', $result->mode);

        // Clara: weight 0.6, target round(21400*0.6) = 12840
        $this->assertEquals(0.6, $result->members[0]->weight);
        $this->assertEquals(12840, $result->members[0]->targetCents);
        $this->assertEquals(10000, $result->members[0]->paidCents);
        $this->assertEquals(-2840, $result->members[0]->deltaCents);

        // Julien: weight 0.4, target 21400 - 12840 = 8560 (avoiding drift)
        $this->assertEquals(0.4, $result->members[1]->weight);
        $this->assertEquals(8560, $result->members[1]->targetCents);
        $this->assertEquals(11400, $result->members[1]->paidCents);
        $this->assertEquals(2840, $result->members[1]->deltaCents);

        // Settlement: Clara owes Julien 2840
        $this->assertNotNull($result->settlement);
        $this->assertEquals(1, $result->settlement->fromUserId);
        $this->assertEquals(2, $result->settlement->toUserId);
        $this->assertEquals(2840, $result->settlement->amountCents);
    }

    public function testPercentageMode3367(): void
    {
        // Setup users
        $userA = $this->createUser(1, 'Alice');
        $userB = $this->createUser(2, 'Bob');

        // Setup couple with percentage mode
        $couple = new Couple();
        $couple->setMode(CoupleMode::PERCENTAGE);

        // Alice 33%, Bob 67%
        $memberA = $this->createMember($userA, null, 33);
        $memberB = $this->createMember($userB, null, 67);

        // Total: 10000 cents, Alice paid 5000, Bob paid 5000
        $expenses = [
            $this->createExpense($couple, $userA, 5000),
            $this->createExpense($couple, $userB, 5000),
        ];

        $this->monthClosureRepository->method('findByMonth')->willReturn(null);
        $this->expenseRepository->method('findByMonth')->willReturn($expenses);
        $this->coupleContextService->method('getMembers')->willReturn([$memberA, $memberB]);

        // Calculate
        $result = $this->service->calculateBalance($couple, 2026, 2);

        // Assert
        $this->assertEquals(10000, $result->totalCents);
        $this->assertEquals('percentage', $result->mode);

        // Alice: weight 0.33, target round(10000*0.33) = 3300
        $this->assertEquals(0.33, $result->members[0]->weight);
        $this->assertEquals(3300, $result->members[0]->targetCents);
        $this->assertEquals(5000, $result->members[0]->paidCents);
        $this->assertEquals(1700, $result->members[0]->deltaCents);

        // Bob: weight 0.67, target 10000 - 3300 = 6700
        $this->assertEquals(0.67, $result->members[1]->weight);
        $this->assertEquals(6700, $result->members[1]->targetCents);
        $this->assertEquals(5000, $result->members[1]->paidCents);
        $this->assertEquals(-1700, $result->members[1]->deltaCents);

        // Settlement: Bob owes Alice 1700
        $this->assertNotNull($result->settlement);
        $this->assertEquals(2, $result->settlement->fromUserId);
        $this->assertEquals(1, $result->settlement->toUserId);
        $this->assertEquals(1700, $result->settlement->amountCents);
    }

    public function testSettlementNullWhenDeltaZero(): void
    {
        // Setup users
        $userA = $this->createUser(1, 'Clara');
        $userB = $this->createUser(2, 'Julien');

        // Setup couple with equal mode
        $couple = new Couple();
        $couple->setMode(CoupleMode::EQUAL);

        $memberA = $this->createMember($userA);
        $memberB = $this->createMember($userB);

        // Both paid exactly half: 5000 each
        $expenses = [
            $this->createExpense($couple, $userA, 5000),
            $this->createExpense($couple, $userB, 5000),
        ];

        $this->monthClosureRepository->method('findByMonth')->willReturn(null);
        $this->expenseRepository->method('findByMonth')->willReturn($expenses);
        $this->coupleContextService->method('getMembers')->willReturn([$memberA, $memberB]);

        // Calculate
        $result = $this->service->calculateBalance($couple, 2026, 2);

        // Assert
        $this->assertEquals(10000, $result->totalCents);

        // Clara: delta = 0
        $this->assertEquals(5000, $result->members[0]->targetCents);
        $this->assertEquals(5000, $result->members[0]->paidCents);
        $this->assertEquals(0, $result->members[0]->deltaCents);

        // Julien: delta = 0
        $this->assertEquals(5000, $result->members[1]->targetCents);
        $this->assertEquals(5000, $result->members[1]->paidCents);
        $this->assertEquals(0, $result->members[1]->deltaCents);

        // No settlement needed
        $this->assertNull($result->settlement);
    }

    public function testEmptyMonthReturnsZeroBalance(): void
    {
        $userA = $this->createUser(1, 'Clara');
        $userB = $this->createUser(2, 'Julien');

        $couple = new Couple();
        $couple->setMode(CoupleMode::EQUAL);

        $memberA = $this->createMember($userA);
        $memberB = $this->createMember($userB);

        $this->monthClosureRepository->method('findByMonth')->willReturn(null);
        $this->expenseRepository->method('findByMonth')->willReturn([]);
        $this->coupleContextService->method('getMembers')->willReturn([$memberA, $memberB]);

        $result = $this->service->calculateBalance($couple, 2026, 2);

        $this->assertEquals(0, $result->totalCents);
        $this->assertSame('EUR', $result->currency);
        $this->assertEquals(0, $result->members[0]->targetCents);
        $this->assertEquals(0, $result->members[0]->paidCents);
        $this->assertEquals(0, $result->members[0]->deltaCents);
        $this->assertNull($result->settlement);
    }

    public function testEqualSplitIgnoresProrataWeights(): void
    {
        $userA = $this->createUser(1, 'Clara');
        $userB = $this->createUser(2, 'Julien');

        // 70/30 prorata, but the expense is flagged 50/50
        $couple = new Couple();
        $couple->setMode(CoupleMode::PERCENTAGE);
        $memberA = $this->createMember($userA, null, 70);
        $memberB = $this->createMember($userB, null, 30);

        $expenses = [
            $this->createExpense($couple, $userA, 10000, SplitMode::EQUAL),
        ];

        $this->monthClosureRepository->method('findByMonth')->willReturn(null);
        $this->expenseRepository->method('findByMonth')->willReturn($expenses);
        $this->coupleContextService->method('getMembers')->willReturn([$memberA, $memberB]);

        $result = $this->service->calculateBalance($couple, 2026, 2);

        $this->assertEquals(0, $result->prorataTotalCents);
        $this->assertEquals(10000, $result->equalTotalCents);

        // Both owe 5000 despite the 70/30 setting
        $this->assertEquals(5000, $result->members[0]->targetCents);
        $this->assertEquals(5000, $result->members[0]->equalTargetCents);
        $this->assertEquals(5000, $result->members[1]->targetCents);

        // Clara advanced everything: Julien owes her 5000
        $this->assertEquals(5000, $result->members[0]->deltaCents);
        $this->assertEquals(2, $result->settlement->fromUserId);
        $this->assertEquals(1, $result->settlement->toUserId);
        $this->assertEquals(5000, $result->settlement->amountCents);
    }

    public function testFullSplitChargesTheWholeExpenseToOneMember(): void
    {
        $userA = $this->createUser(1, 'Clara');
        $userB = $this->createUser(2, 'Julien');

        $couple = new Couple();
        $couple->setMode(CoupleMode::EQUAL);
        $memberA = $this->createMember($userA);
        $memberB = $this->createMember($userB);

        // Clara advanced 8000 that are entirely Julien's: he owes her the full amount
        $expenses = [
            $this->createExpense($couple, $userA, 8000, SplitMode::FULL, $userB),
        ];

        $this->monthClosureRepository->method('findByMonth')->willReturn(null);
        $this->expenseRepository->method('findByMonth')->willReturn($expenses);
        $this->coupleContextService->method('getMembers')->willReturn([$memberA, $memberB]);

        $result = $this->service->calculateBalance($couple, 2026, 2);

        $this->assertEquals(8000, $result->directTotalCents);
        $this->assertEquals(0, $result->members[0]->targetCents);
        $this->assertEquals(8000, $result->members[1]->targetCents);
        $this->assertEquals(8000, $result->members[1]->directTargetCents);

        $this->assertEquals(8000, $result->members[0]->deltaCents);
        $this->assertEquals(2, $result->settlement->fromUserId);
        $this->assertEquals(1, $result->settlement->toUserId);
        $this->assertEquals(8000, $result->settlement->amountCents);
    }

    public function testMixedSplitModesAddUpToTheMonthTotal(): void
    {
        $userA = $this->createUser(1, 'Clara');
        $userB = $this->createUser(2, 'Julien');

        $couple = new Couple();
        $couple->setMode(CoupleMode::INCOME);
        $memberA = $this->createMember($userA, 240000, null); // 60%
        $memberB = $this->createMember($userB, 160000, null); // 40%

        $expenses = [
            $this->createExpense($couple, $userA, 10000, SplitMode::PRORATA), // 6000 / 4000
            $this->createExpense($couple, $userA, 3000, SplitMode::EQUAL),    // 1500 / 1500
            $this->createExpense($couple, $userA, 2000, SplitMode::FULL, $userB), // 0 / 2000
        ];

        $this->monthClosureRepository->method('findByMonth')->willReturn(null);
        $this->expenseRepository->method('findByMonth')->willReturn($expenses);
        $this->coupleContextService->method('getMembers')->willReturn([$memberA, $memberB]);

        $result = $this->service->calculateBalance($couple, 2026, 2);

        $this->assertEquals(15000, $result->totalCents);
        $this->assertEquals(10000, $result->prorataTotalCents);
        $this->assertEquals(3000, $result->equalTotalCents);
        $this->assertEquals(2000, $result->directTotalCents);

        $this->assertEquals(7500, $result->members[0]->targetCents); // 6000 + 1500
        $this->assertEquals(7500, $result->members[1]->targetCents); // 4000 + 1500 + 2000
        $this->assertEquals(
            $result->totalCents,
            $result->members[0]->targetCents + $result->members[1]->targetCents
        );

        // Clara paid everything: Julien owes her his 7500 share
        $this->assertEquals(7500, $result->members[0]->deltaCents);
        $this->assertEquals(7500, $result->settlement->amountCents);
    }

    public function testTransfersReduceWhatIsStillOwed(): void
    {
        $userA = $this->createUser(1, 'Clara');
        $userB = $this->createUser(2, 'Julien');

        $couple = new Couple();
        $couple->setMode(CoupleMode::EQUAL);
        $memberA = $this->createMember($userA);
        $memberB = $this->createMember($userB);

        // Clara advanced 10000, so Julien owes her 5000...
        $expenses = [$this->createExpense($couple, $userA, 10000)];
        // ...and he already wired her 2000
        $transfers = [$this->createTransfer($couple, $userB, $userA, 2000)];

        $this->monthClosureRepository->method('findByMonth')->willReturn(null);
        $this->expenseRepository->method('findByMonth')->willReturn($expenses);
        $this->transferRepository->method('findByMonth')->willReturn($transfers);
        $this->coupleContextService->method('getMembers')->willReturn([$memberA, $memberB]);

        $result = $this->service->calculateBalance($couple, 2026, 2);

        $this->assertEquals(2000, $result->transfersTotalCents);

        // Raw delta is untouched, the net one accounts for the transfer
        $this->assertEquals(5000, $result->members[0]->deltaCents);
        $this->assertEquals(2000, $result->members[0]->transferredInCents);
        $this->assertEquals(3000, $result->members[0]->netDeltaCents);

        $this->assertEquals(2000, $result->members[1]->transferredOutCents);
        $this->assertEquals(-3000, $result->members[1]->netDeltaCents);

        // Only 3000 left to wire
        $this->assertEquals(2, $result->settlement->fromUserId);
        $this->assertEquals(1, $result->settlement->toUserId);
        $this->assertEquals(3000, $result->settlement->amountCents);
    }

    public function testTransferSettlingTheMonthLeavesNoSettlement(): void
    {
        $userA = $this->createUser(1, 'Clara');
        $userB = $this->createUser(2, 'Julien');

        $couple = new Couple();
        $couple->setMode(CoupleMode::EQUAL);
        $memberA = $this->createMember($userA);
        $memberB = $this->createMember($userB);

        $expenses = [$this->createExpense($couple, $userA, 10000)];
        $transfers = [$this->createTransfer($couple, $userB, $userA, 5000)];

        $this->monthClosureRepository->method('findByMonth')->willReturn(null);
        $this->expenseRepository->method('findByMonth')->willReturn($expenses);
        $this->transferRepository->method('findByMonth')->willReturn($transfers);
        $this->coupleContextService->method('getMembers')->willReturn([$memberA, $memberB]);

        $result = $this->service->calculateBalance($couple, 2026, 2);

        $this->assertEquals(0, $result->members[0]->netDeltaCents);
        $this->assertNull($result->settlement);
    }

    public function testClosedMonthSnapshotWithoutNewFieldsStaysReadable(): void
    {
        $couple = new Couple();
        $couple->setMode(CoupleMode::EQUAL);

        // Snapshot written before split modes and transfers existed
        $closure = new MonthClosure();
        $closure->setSnapshotJson([
            'year' => 2026,
            'month' => 1,
            'totalCents' => 10000,
            'currency' => 'EUR',
            'mode' => 'equal',
            'members' => [
                ['userId' => 1, 'displayName' => 'Clara', 'weight' => 0.5, 'targetCents' => 5000, 'paidCents' => 6000, 'deltaCents' => 1000],
                ['userId' => 2, 'displayName' => 'Julien', 'weight' => 0.5, 'targetCents' => 5000, 'paidCents' => 4000, 'deltaCents' => -1000],
            ],
            'settlement' => ['fromUserId' => 2, 'toUserId' => 1, 'amountCents' => 1000],
        ]);

        $this->monthClosureRepository->method('findByMonth')->willReturn($closure);

        $result = $this->service->calculateBalance($couple, 2026, 1);

        $this->assertTrue($result->isClosed);
        $this->assertEquals(10000, $result->totalCents);
        $this->assertEquals(10000, $result->prorataTotalCents);
        $this->assertEquals(0, $result->equalTotalCents);
        $this->assertEquals(0, $result->transfersTotalCents);

        // Legacy months carry no transfer, so net delta equals the raw delta
        $this->assertEquals(1000, $result->members[0]->deltaCents);
        $this->assertEquals(1000, $result->members[0]->netDeltaCents);
        $this->assertEquals(1000, $result->settlement->amountCents);
    }

    // Helper methods

    private function createUser(int $id, string $name): User
    {
        $user = new User();

        // Use reflection to set the ID
        $reflection = new \ReflectionClass($user);
        $idProperty = $reflection->getProperty('id');
        $idProperty->setValue($user, $id);

        $user->setDisplayName($name);
        $user->setEmail(strtolower($name) . '@test.com');

        return $user;
    }

    private function createMember(User $user, ?int $incomeCents = null, ?int $percentage = null): CoupleMember
    {
        $member = new CoupleMember();
        $member->setUser($user);
        $member->setIncomeCents($incomeCents);
        $member->setPercentage($percentage);

        return $member;
    }

    private function createExpense(
        Couple $couple,
        User $paidBy,
        int $amountCents,
        SplitMode $splitMode = SplitMode::PRORATA,
        ?User $chargedTo = null
    ): Expense {
        $expense = new Expense();
        $expense->setCouple($couple);
        $expense->setPaidBy($paidBy);
        $expense->setAmountCents($amountCents);
        $expense->setCurrency('EUR');
        $expense->setTitle('Test expense');
        $expense->setCategory('test');
        $expense->setSpentAt(new \DateTimeImmutable('2026-02-15'));
        $expense->setSplitMode($splitMode);
        $expense->setChargedTo($chargedTo);

        return $expense;
    }

    private function createTransfer(Couple $couple, User $from, User $to, int $amountCents): Transfer
    {
        $transfer = new Transfer();
        $transfer->setCouple($couple);
        $transfer->setFromUser($from);
        $transfer->setToUser($to);
        $transfer->setAmountCents($amountCents);
        $transfer->setCurrency('EUR');
        $transfer->setTransferredAt(new \DateTimeImmutable('2026-02-20'));

        return $transfer;
    }
}