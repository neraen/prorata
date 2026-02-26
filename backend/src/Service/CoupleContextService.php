<?php

namespace App\Service;

use App\Entity\Couple;
use App\Entity\CoupleMember;
use App\Entity\User;
use App\Repository\CoupleMemberRepository;

class CoupleContextService
{
    public function __construct(
        private CoupleMemberRepository $coupleMemberRepository
    ) {}

    public function getCurrentCouple(User $user): ?Couple
    {
        $membership = $this->coupleMemberRepository->findByUser($user);

        return $membership?->getCouple();
    }

    /**
     * Get members in stable order (by createdAt ASC)
     * @return CoupleMember[]
     */
    public function getMembers(Couple $couple): array
    {
        return $couple->getOrderedMembers();
    }

    public function getMemberA(Couple $couple): ?CoupleMember
    {
        $members = $this->getMembers($couple);
        return $members[0] ?? null;
    }

    public function getMemberB(Couple $couple): ?CoupleMember
    {
        $members = $this->getMembers($couple);
        return $members[1] ?? null;
    }
}