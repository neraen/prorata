<?php

namespace App\Repository;

use App\Entity\PersonalExpense;
use App\Entity\Recurrence;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<PersonalExpense>
 */
class PersonalExpenseRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PersonalExpense::class);
    }

    /**
     * Every expense counting towards a month for this owner: the one-off ones
     * dated in the month, plus the monthly ones still running that month.
     *
     * @return PersonalExpense[]
     */
    public function findForMonth(User $owner, int $year, int $month): array
    {
        $firstOfMonth = new \DateTimeImmutable(sprintf('%04d-%02d-01', $year, $month));
        $lastOfMonth = $firstOfMonth->modify('last day of this month');

        return $this->createQueryBuilder('p')
            ->where('p.owner = :owner')
            ->andWhere(
                '(p.recurrence = :once AND p.startsOn BETWEEN :start AND :end)
                 OR (p.recurrence = :monthly AND p.startsOn <= :end AND (p.endsOn IS NULL OR p.endsOn >= :start))'
            )
            ->setParameter('owner', $owner)
            ->setParameter('once', Recurrence::NONE->value)
            ->setParameter('monthly', Recurrence::MONTHLY->value)
            ->setParameter('start', $firstOfMonth)
            ->setParameter('end', $lastOfMonth)
            ->orderBy('p.startsOn', 'DESC')
            ->addOrderBy('p.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    public function findByIdAndOwner(int $id, User $owner): ?PersonalExpense
    {
        return $this->findOneBy(['id' => $id, 'owner' => $owner]);
    }
}
