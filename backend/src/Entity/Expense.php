<?php

namespace App\Entity;

use App\Repository\ExpenseRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ExpenseRepository::class)]
#[ORM\Index(name: 'IDX_COUPLE_SPENT_AT', columns: ['couple_id', 'spent_at'])]
#[ORM\HasLifecycleCallbacks]
class Expense
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Couple::class, inversedBy: 'expenses')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Couple $couple = null;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'expenses')]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $paidBy = null;

    #[ORM\Column(length: 255)]
    private ?string $title = null;

    #[ORM\Column(length: 50)]
    private ?string $category = null;

    #[ORM\Column]
    private ?int $amountCents = null;

    #[ORM\Column(length: 3)]
    private string $currency = 'EUR';

    #[ORM\Column(length: 20, enumType: SplitMode::class, options: ['default' => 'prorata'])]
    private SplitMode $splitMode = SplitMode::PRORATA;

    /**
     * Member bearing 100% of the expense. Only meaningful when splitMode is FULL.
     */
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $chargedTo = null;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private ?\DateTimeImmutable $spentAt = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\PrePersist]
    public function setCreatedAtValue(): void
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getCouple(): ?Couple
    {
        return $this->couple;
    }

    public function setCouple(?Couple $couple): static
    {
        $this->couple = $couple;

        return $this;
    }

    public function getPaidBy(): ?User
    {
        return $this->paidBy;
    }

    public function setPaidBy(?User $paidBy): static
    {
        $this->paidBy = $paidBy;

        return $this;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;

        return $this;
    }

    public function getCategory(): ?string
    {
        return $this->category;
    }

    public function setCategory(string $category): static
    {
        $this->category = $category;

        return $this;
    }

    public function getAmountCents(): ?int
    {
        return $this->amountCents;
    }

    public function setAmountCents(int $amountCents): static
    {
        $this->amountCents = $amountCents;

        return $this;
    }

    public function getCurrency(): string
    {
        return $this->currency;
    }

    public function setCurrency(string $currency): static
    {
        $this->currency = $currency;

        return $this;
    }

    public function getSplitMode(): SplitMode
    {
        return $this->splitMode;
    }

    public function setSplitMode(SplitMode $splitMode): static
    {
        $this->splitMode = $splitMode;

        return $this;
    }

    public function getChargedTo(): ?User
    {
        return $this->chargedTo;
    }

    public function setChargedTo(?User $chargedTo): static
    {
        $this->chargedTo = $chargedTo;

        return $this;
    }

    public function getSpentAt(): ?\DateTimeImmutable
    {
        return $this->spentAt;
    }

    public function setSpentAt(\DateTimeImmutable $spentAt): static
    {
        $this->spentAt = $spentAt;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): static
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    /**
     * The split actually applied.
     *
     * A "full" expense whose charged member is gone (deleted account) falls
     * back to the prorata split rather than dropping out of the balance.
     */
    public function effectiveSplitMode(): SplitMode
    {
        if ($this->splitMode === SplitMode::FULL && $this->chargedTo === null) {
            return SplitMode::PRORATA;
        }

        return $this->splitMode;
    }

    public function getYear(): int
    {
        return (int) $this->spentAt->format('Y');
    }

    public function getMonth(): int
    {
        return (int) $this->spentAt->format('n');
    }
}