<?php

namespace App\Tests\Service;

use App\Entity\Couple;
use App\Entity\CoupleMember;
use App\Entity\CoupleMode;
use App\Entity\Expense;
use App\Entity\User;
use App\Repository\ExpenseRepository;
use App\Repository\MonthClosureRepository;
use App\Service\CoupleContextService;
use App\Service\MonthlyBalanceService;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class MonthlyBalanceServiceTest extends TestCase
{
    private MonthlyBalanceService $service;
    private ExpenseRepository&MockObject $expenseRepository;
    private MonthClosureRepository&MockObject $monthClosureRepository;
    private CoupleContextService&MockObject $coupleContextService;

    protected function setUp(): void
    {
        $this->expenseRepository = $this->createMock(ExpenseRepository::class);
        $this->monthClosureRepository = $this->createMock(MonthClosureRepository::class);
        $this->coupleContextService = $this->createMock(CoupleContextService::class);

        $this->service = new MonthlyBalanceService(
            $this->expenseRepository,
            $this->monthClosureRepository,
            $this->coupleContextService
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
        $this->assertEquals(0, $result->members[0]->targetCents);
        $this->assertEquals(0, $result->members[0]->paidCents);
        $this->assertEquals(0, $result->members[0]->deltaCents);
        $this->assertNull($result->settlement);
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

    private function createExpense(Couple $couple, User $paidBy, int $amountCents): Expense
    {
        $expense = new Expense();
        $expense->setCouple($couple);
        $expense->setPaidBy($paidBy);
        $expense->setAmountCents($amountCents);
        $expense->setCurrency('EUR');
        $expense->setTitle('Test expense');
        $expense->setCategory('test');
        $expense->setSpentAt(new \DateTimeImmutable('2026-02-15'));

        return $expense;
    }
}