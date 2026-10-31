<?php

namespace App\DTO\Response;

class MemberBalanceResponse
{
    public int $userId;
    public string $displayName;
    public float $weight;
    public int $targetCents;
    public int $paidCents;
    public int $deltaCents;

    /** Part of targetCents coming from prorata-split expenses. */
    public int $prorataTargetCents = 0;
    /** Part of targetCents coming from 50/50 expenses. */
    public int $equalTargetCents = 0;
    /** Part of targetCents coming from expenses fully charged to this member. */
    public int $directTargetCents = 0;

    /** Money this member transferred to the other one over the period. */
    public int $transferredOutCents = 0;
    /** Money this member received from the other one over the period. */
    public int $transferredInCents = 0;

    /** deltaCents once transfers are taken into account: what is still owed to this member. */
    public int $netDeltaCents = 0;

    public static function create(
        int $userId,
        string $displayName,
        float $weight,
        int $targetCents,
        int $paidCents,
        int $deltaCents
    ): self {
        $dto = new self();
        $dto->userId = $userId;
        $dto->displayName = $displayName;
        $dto->weight = $weight;
        $dto->targetCents = $targetCents;
        $dto->paidCents = $paidCents;
        $dto->deltaCents = $deltaCents;
        $dto->netDeltaCents = $deltaCents;

        return $dto;
    }

    public function withBreakdown(int $prorataCents, int $equalCents, int $directCents): self
    {
        $this->prorataTargetCents = $prorataCents;
        $this->equalTargetCents = $equalCents;
        $this->directTargetCents = $directCents;

        return $this;
    }

    public function withTransfers(int $transferredOutCents, int $transferredInCents): self
    {
        $this->transferredOutCents = $transferredOutCents;
        $this->transferredInCents = $transferredInCents;
        $this->netDeltaCents = $this->deltaCents + $transferredOutCents - $transferredInCents;

        return $this;
    }

    public function toArray(): array
    {
        return [
            'userId' => $this->userId,
            'displayName' => $this->displayName,
            'weight' => $this->weight,
            'targetCents' => $this->targetCents,
            'paidCents' => $this->paidCents,
            'deltaCents' => $this->deltaCents,
            'prorataTargetCents' => $this->prorataTargetCents,
            'equalTargetCents' => $this->equalTargetCents,
            'directTargetCents' => $this->directTargetCents,
            'transferredOutCents' => $this->transferredOutCents,
            'transferredInCents' => $this->transferredInCents,
            'netDeltaCents' => $this->netDeltaCents,
        ];
    }

    /**
     * Rebuilds a member balance from a stored snapshot, tolerating snapshots
     * written before the split-mode and transfer fields existed.
     */
    public static function fromArray(array $data): self
    {
        $dto = self::create(
            $data['userId'],
            $data['displayName'],
            $data['weight'],
            $data['targetCents'],
            $data['paidCents'],
            $data['deltaCents']
        );

        $dto->withBreakdown(
            $data['prorataTargetCents'] ?? $data['targetCents'],
            $data['equalTargetCents'] ?? 0,
            $data['directTargetCents'] ?? 0
        );

        $dto->withTransfers(
            $data['transferredOutCents'] ?? 0,
            $data['transferredInCents'] ?? 0
        );

        return $dto;
    }
}
