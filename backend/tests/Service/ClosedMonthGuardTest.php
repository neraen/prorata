<?php

namespace App\Tests\Service;

use App\Entity\Couple;
use App\Entity\MonthClosure;
use App\Exception\MonthClosedException;
use App\Repository\MonthClosureRepository;
use App\Service\ClosedMonthGuard;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class ClosedMonthGuardTest extends TestCase
{
    private ClosedMonthGuard $guard;
    private MonthClosureRepository&MockObject $repository;

    protected function setUp(): void
    {
        $this->repository = $this->createMock(MonthClosureRepository::class);
        $this->guard = new ClosedMonthGuard($this->repository);
    }

    public function testIsClosedReturnsTrueWhenClosed(): void
    {
        $couple = new Couple();
        $closure = new MonthClosure();

        $this->repository->method('findByMonth')
            ->with($couple, 2026, 1)
            ->willReturn($closure);

        $this->assertTrue($this->guard->isClosed($couple, 2026, 1));
    }

    public function testIsClosedReturnsFalseWhenOpen(): void
    {
        $couple = new Couple();

        $this->repository->method('findByMonth')
            ->with($couple, 2026, 2)
            ->willReturn(null);

        $this->assertFalse($this->guard->isClosed($couple, 2026, 2));
    }

    public function testAssertNotClosedThrowsExceptionWhenClosed(): void
    {
        $couple = new Couple();
        $closure = new MonthClosure();

        $this->repository->method('findByMonth')
            ->willReturn($closure);

        $this->expectException(MonthClosedException::class);
        $this->expectExceptionMessage('Month 1/2026 is already closed');

        $this->guard->assertNotClosed($couple, 2026, 1);
    }

    public function testAssertNotClosedDoesNotThrowWhenOpen(): void
    {
        $couple = new Couple();

        $this->repository->method('findByMonth')
            ->willReturn(null);

        // Should not throw
        $this->guard->assertNotClosed($couple, 2026, 2);

        // If we get here, the test passes
        $this->assertTrue(true);
    }
}