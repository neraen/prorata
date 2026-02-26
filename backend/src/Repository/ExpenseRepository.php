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

    public function findByIdAndCouple(int $id, Couple $couple): ?Expense
    {
        return $this->findOneBy(['id' => $id, 'couple' => $couple]);
    }
}