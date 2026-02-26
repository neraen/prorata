<?php

namespace App\Repository;

use App\Entity\Couple;
use App\Entity\MonthClosure;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<MonthClosure>
 */
class MonthClosureRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, MonthClosure::class);
    }

    public function findByMonth(Couple $couple, int $year, int $month): ?MonthClosure
    {
        return $this->findOneBy([
            'couple' => $couple,
            'year' => $year,
            'month' => $month,
        ]);
    }

    public function isClosed(Couple $couple, int $year, int $month): bool
    {
        return $this->findByMonth($couple, $year, $month) !== null;
    }

    /**
     * @return MonthClosure[]
     */
    public function findAllByCouple(Couple $couple): array
    {
        return $this->createQueryBuilder('c')
            ->where('c.couple = :couple')
            ->setParameter('couple', $couple)
            ->orderBy('c.year', 'DESC')
            ->addOrderBy('c.month', 'DESC')
            ->getQuery()
            ->getResult();
    }
}