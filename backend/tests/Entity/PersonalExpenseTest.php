<?php

namespace App\Tests\Entity;

use App\Entity\PersonalExpense;
use App\Entity\Recurrence;
use PHPUnit\Framework\TestCase;

class PersonalExpenseTest extends TestCase
{
    public function testOneOffExpenseOnlyCountsInItsOwnMonth(): void
    {
        $expense = $this->createExpense(Recurrence::NONE, '2026-03-15');

        $this->assertTrue($expense->appliesTo(2026, 3));
        $this->assertFalse($expense->appliesTo(2026, 2));
        $this->assertFalse($expense->appliesTo(2026, 4));
    }

    public function testMonthlyExpenseRunsFromItsStartOnwards(): void
    {
        $expense = $this->createExpense(Recurrence::MONTHLY, '2026-03-05');

        $this->assertFalse($expense->appliesTo(2026, 2));
        $this->assertTrue($expense->appliesTo(2026, 3));
        $this->assertTrue($expense->appliesTo(2026, 4));
        $this->assertTrue($expense->appliesTo(2027, 1));
    }

    public function testMonthlyExpenseStopsAfterItsEndDate(): void
    {
        $expense = $this->createExpense(Recurrence::MONTHLY, '2026-01-10', '2026-03-31');

        $this->assertTrue($expense->appliesTo(2026, 1));
        $this->assertTrue($expense->appliesTo(2026, 3));
        $this->assertFalse($expense->appliesTo(2026, 4));
    }

    public function testEndDateInsideTheMonthStillCountsThatMonth(): void
    {
        // Stopped on the 10th: the month it stopped in is still charged
        $expense = $this->createExpense(Recurrence::MONTHLY, '2026-01-10', '2026-03-10');

        $this->assertTrue($expense->appliesTo(2026, 3));
        $this->assertFalse($expense->appliesTo(2026, 4));
    }

    public function testMonthlyOccurrenceKeepsItsDayOfMonth(): void
    {
        $expense = $this->createExpense(Recurrence::MONTHLY, '2026-01-05');

        $this->assertEquals('2026-04-05', $expense->occurrenceDate(2026, 4)->format('Y-m-d'));
    }

    public function testMonthlyOccurrenceIsClampedToShortMonths(): void
    {
        // A 31st has to land on the 28th in February
        $expense = $this->createExpense(Recurrence::MONTHLY, '2026-01-31');

        $this->assertEquals('2026-02-28', $expense->occurrenceDate(2026, 2)->format('Y-m-d'));
        $this->assertEquals('2026-03-31', $expense->occurrenceDate(2026, 3)->format('Y-m-d'));
    }

    public function testOneOffOccurrenceKeepsItsOwnDate(): void
    {
        $expense = $this->createExpense(Recurrence::NONE, '2026-03-15');

        $this->assertEquals('2026-03-15', $expense->occurrenceDate(2026, 3)->format('Y-m-d'));
    }

    private function createExpense(Recurrence $recurrence, string $startsOn, ?string $endsOn = null): PersonalExpense
    {
        $expense = new PersonalExpense();
        $expense->setTitle('Abonnement');
        $expense->setCategory('other');
        $expense->setAmountCents(1000);
        $expense->setRecurrence($recurrence);
        $expense->setStartsOn(new \DateTimeImmutable($startsOn));
        $expense->setEndsOn($endsOn !== null ? new \DateTimeImmutable($endsOn) : null);

        return $expense;
    }
}
