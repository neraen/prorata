<?php

namespace App\Repository;

use App\Entity\CoupleInvite;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CoupleInvite>
 */
class CoupleInviteRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CoupleInvite::class);
    }

    public function findValidByToken(string $token): ?CoupleInvite
    {
        return $this->createQueryBuilder('i')
            ->where('i.token = :token')
            ->andWhere('i.usedAt IS NULL')
            ->setParameter('token', $token)
            ->getQuery()
            ->getOneOrNullResult();
    }
}