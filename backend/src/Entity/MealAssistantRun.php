<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/** Stored through DBAL to keep quota reservation and approval atomic. */
#[ORM\Entity]
#[ORM\Table(name: 'meal_assistant_run')]
#[ORM\Index(name: 'IDX_MEAL_ASSISTANT_COUPLE_DATE', columns: ['couple_id', 'created_at'])]
class MealAssistantRun
{
    #[ORM\Id]
    #[ORM\Column(length: 36)]
    private string $id;

    #[ORM\ManyToOne(targetEntity: Couple::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Couple $couple;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'created_by_user_id', nullable: false, onDelete: 'CASCADE')]
    private User $createdBy;

    #[ORM\Column(length: 20, options: ['default' => 'plan'])]
    private string $purpose = 'plan';

    #[ORM\Column(length: 16)]
    private string $status;

    #[ORM\Column(length: 100)]
    private string $model;

    #[ORM\Column(length: 64)]
    private string $requestHash;

    #[ORM\Column(length: 64)]
    private string $contextHash;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $result = null;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $tokenUsage = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $acceptedAt = null;
}
