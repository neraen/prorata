<?php

namespace App\Repository;

use App\Entity\Couple;
use App\Entity\Transfer;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Transfer>
 */
class TransferRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Transfer::class);
    }

    /**
     * @return Transfer[]
     */
    public function findByMonth(Couple $couple, int $year, int $month): array
    {
        $startDate = new \DateTimeImmutable(sprintf('%04d-%02d-01', $year, $month));
        $endDate = $startDate->modify('last day of this month');

        return $this->createQueryBuilder('t')
            ->where('t.couple = :couple')
            ->andWhere('t.transferredAt >= :start')
            ->andWhere('t.transferredAt <= :end')
            ->setParameter('couple', $couple)
            ->setParameter('start', $startDate)
            ->setParameter('end', $endDate)
            ->orderBy('t.transferredAt', 'DESC')
            ->addOrderBy('t.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return Transfer[]
     */
    public function findAllByCouple(Couple $couple): array
    {
        return $this->createQueryBuilder('t')
            ->where('t.couple = :couple')
            ->setParameter('couple', $couple)
            ->orderBy('t.transferredAt', 'DESC')
            ->addOrderBy('t.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Distinct months holding at least one transfer, oldest first.
     *
     * Grouped in PHP for the same reason as ExpenseRepository::findDistinctMonths().
     *
     * @return array<int, array{year: int, month: int}>
     */
    public function findDistinctMonths(Couple $couple): array
    {
        $rows = $this->createQueryBuilder('t')
            ->select('DISTINCT t.transferredAt AS transferredAt')
            ->where('t.couple = :couple')
            ->setParameter('couple', $couple)
            ->getQuery()
            ->getScalarResult();

        return ExpenseRepository::groupByMonth($rows, 'transferredAt');
    }

    public function findByIdAndCouple(int $id, Couple $couple): ?Transfer
    {
        return $this->findOneBy(['id' => $id, 'couple' => $couple]);
    }
}
