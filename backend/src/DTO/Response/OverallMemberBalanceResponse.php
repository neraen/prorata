<?php

namespace App\DTO\Response;

/**
 * Cumulative position of one member across every recorded month.
 */
class OverallMemberBalanceResponse
{
    public int $userId;
    public string $displayName;

    /** Everything this member actually disbursed for the couple. */
    public int $paidCents = 0;
    /** Everything this member was supposed to bear, all split modes included. */
    public int $targetCents = 0;
    /** paidCents - targetCents, before transfers. */
    public int $deltaCents = 0;

    public int $prorataTargetCents = 0;
    public int $equalTargetCents = 0;
    public int $directTargetCents = 0;

    public int $transferredOutCents = 0;
    public int $transferredInCents = 0;

    /** What is still owed to this member once transfers are settled. */
    public int $netDeltaCents = 0;

    public static function create(int $userId, string $displayName): self
    {
        $dto = new self();
        $dto->userId = $userId;
        $dto->displayName = $displayName;

        return $dto;
    }

    public function add(MemberBalanceResponse $monthly): void
    {
        $this->paidCents += $monthly->paidCents;
        $this->targetCents += $monthly->targetCents;
        $this->deltaCents += $monthly->deltaCents;
        $this->prorataTargetCents += $monthly->prorataTargetCents;
        $this->equalTargetCents += $monthly->equalTargetCents;
        $this->directTargetCents += $monthly->directTargetCents;
        $this->transferredOutCents += $monthly->transferredOutCents;
        $this->transferredInCents += $monthly->transferredInCents;
        $this->netDeltaCents += $monthly->netDeltaCents;
    }
}
