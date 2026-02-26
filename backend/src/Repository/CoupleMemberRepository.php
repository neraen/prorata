<?php

namespace App\Repository;

use App\Entity\CoupleMember;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CoupleMember>
 */
class CoupleMemberRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CoupleMember::class);
    }

    public function findByUser(User $user): ?CoupleMember
    {
        return $this->findOneBy(['user' => $user]);
    }
}