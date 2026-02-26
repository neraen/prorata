<?php

namespace App\Entity;

use App\Repository\MonthClosureRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: MonthClosureRepository::class)]
#[ORM\Table(name: 'month_closure')]
#[ORM\UniqueConstraint(name: 'UNIQ_COUPLE_YEAR_MONTH', columns: ['couple_id', 'year', 'month'])]
#[ORM\HasLifecycleCallbacks]
class MonthClosure
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Couple::class, inversedBy: 'closures')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Couple $couple = null;

    #[ORM\Column]
    private ?int $year = null;

    #[ORM\Column]
    private ?int $month = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $closedAt = null;

    #[ORM\Column(type: 'json')]
    private array $snapshotJson = [];

    #[ORM\PrePersist]
    public function setClosedAtValue(): void
    {
        $this->closedAt = new \DateTimeImmutable();
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

    public function getYear(): ?int
    {
        return $this->year;
    }

    public function setYear(int $year): static
    {
        $this->year = $year;

        return $this;
    }

    public function getMonth(): ?int
    {
        return $this->month;
    }

    public function setMonth(int $month): static
    {
        $this->month = $month;

        return $this;
    }

    public function getClosedAt(): ?\DateTimeImmutable
    {
        return $this->closedAt;
    }

    public function setClosedAt(\DateTimeImmutable $closedAt): static
    {
        $this->closedAt = $closedAt;

        return $this;
    }

    public function getSnapshotJson(): array
    {
        return $this->snapshotJson;
    }

    public function setSnapshotJson(array $snapshotJson): static
    {
        $this->snapshotJson = $snapshotJson;

        return $this;
    }
}