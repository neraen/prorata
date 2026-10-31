<?php

namespace App\Repository;

use App\Entity\Couple;
use App\Entity\Expense;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Expense>
 */
class ExpenseRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Expense::class);
    }

    /**
     * @return Expense[]
     */
    public function findByMonth(Couple $couple, int $year, int $month): array
    {
        $startDate = new \DateTimeImmutable(sprintf('%04d-%02d-01', $year, $month));
        $endDate = $startDate->modify('last day of this month');

        return $this->createQueryBuilder('e')
            ->where('e.couple = :couple')
            ->andWhere('e.spentAt >= :start')
            ->andWhere('e.spentAt <= :end')
            ->setParameter('couple', $couple)
            ->setParameter('start', $startDate)
            ->setParameter('end', $endDate)
            ->orderBy('e.spentAt', 'DESC')
            ->addOrderBy('e.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Distinct months holding at least one expense, oldest first.
     *
     * YEAR()/MONTH() are not part of standard DQL, so the distinct dates are
     * grouped in PHP rather than in SQL. A couple has few enough spending days
     * for this to stay cheap, and it keeps the query portable.
     *
     * @return array<int, array{year: int, month: int}>
     */
    public function findDistinctMonths(Couple $couple): array
    {
        $rows = $this->createQueryBuilder('e')
            ->select('DISTINCT e.spentAt AS spentAt')
            ->where('e.couple = :couple')
            ->setParameter('couple', $couple)
            ->getQuery()
            ->getScalarResult();

        return self::groupByMonth($rows, 'spentAt');
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     *
     * @return array<int, array{year: int, month: int}>
     */
    public static function groupByMonth(array $rows, string $column): array
    {
        $periods = [];

        foreach ($rows as $row) {
            $value = $row[$column];
            $date = $value instanceof \DateTimeInterface ? $value : new \DateTimeImmutable((string) $value);

            $periods[$date->format('Y-m')] = [
                'year' => (int) $date->format('Y'),
                'month' => (int) $date->format('n'),
            ];
        }

        ksort($periods);

        return array_values($periods);
    }

    public function findByIdAndCouple(int $id, Couple $couple): ?Expense
    {
        return $this->findOneBy(['id' => $id, 'couple' => $couple]);
    }
}