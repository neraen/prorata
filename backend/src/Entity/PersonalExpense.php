<?php

namespace App\Entity;

use App\Repository\PersonalExpenseRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * An expense borne by a single person, outside of the couple's shared accounts.
 *
 * It never touches the couple balance: it is private to its owner, and only
 * shows up on that person's "Perso" view.
 *
 * A monthly expense is stored once as a template rather than duplicated every
 * month: it applies from startsOn until endsOn (or indefinitely).
 */
#[ORM\Entity(repositoryClass: PersonalExpenseRepository::class)]
#[ORM\Table(name: 'personal_expense')]
#[ORM\Index(name: 'IDX_PERSONAL_OWNER_STARTS_AT', columns: ['owner_id', 'starts_on'])]
#[ORM\HasLifecycleCallbacks]
class PersonalExpense
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $owner = null;

    #[ORM\Column(length: 255)]
    private ?string $title = null;

    #[ORM\Column(length: 50)]
    private ?string $category = null;

    #[ORM\Column]
    private ?int $amountCents = null;

    #[ORM\Column(length: 3)]
    private string $currency = 'EUR';

    #[ORM\Column(length: 20, enumType: Recurrence::class, options: ['default' => 'none'])]
    private Recurrence $recurrence = Recurrence::NONE;

    /** Date of a one-off expense, or first month of a recurring one. */
    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private ?\DateTimeImmutable $startsOn = null;

    /** Last month of a recurring expense; null means it still runs. */
    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $endsOn = null;

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

    public function getOwner(): ?User
    {
        return $this->owner;
    }

    public function setOwner(?User $owner): static
    {
        $this->owner = $owner;

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

    public function getRecurrence(): Recurrence
    {
        return $this->recurrence;
    }

    public function setRecurrence(Recurrence $recurrence): static
    {
        $this->recurrence = $recurrence;

        return $this;
    }

    public function isRecurring(): bool
    {
        return $this->recurrence === Recurrence::MONTHLY;
    }

    public function getStartsOn(): ?\DateTimeImmutable
    {
        return $this->startsOn;
    }

    public function setStartsOn(\DateTimeImmutable $startsOn): static
    {
        $this->startsOn = $startsOn;

        return $this;
    }

    public function getEndsOn(): ?\DateTimeImmutable
    {
        return $this->endsOn;
    }

    public function setEndsOn(?\DateTimeImmutable $endsOn): static
    {
        $this->endsOn = $endsOn;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    /**
     * The date this expense falls on for the given month.
     *
     * A one-off expense keeps its own date. A monthly one repeats on the same
     * day of month, clamped to the last day for months that are too short
     * (a 31st becomes the 28th in February).
     */
    public function occurrenceDate(int $year, int $month): \DateTimeImmutable
    {
        if (!$this->isRecurring()) {
            return $this->startsOn;
        }

        $firstOfMonth = new \DateTimeImmutable(sprintf('%04d-%02d-01', $year, $month));
        $lastDay = (int) $firstOfMonth->format('t');
        $day = min((int) $this->startsOn->format('j'), $lastDay);

        return $firstOfMonth->setDate($year, $month, $day);
    }

    /**
     * Whether this expense counts towards the given month.
     */
    public function appliesTo(int $year, int $month): bool
    {
        $firstOfMonth = new \DateTimeImmutable(sprintf('%04d-%02d-01', $year, $month));
        $lastOfMonth = $firstOfMonth->modify('last day of this month');

        if (!$this->isRecurring()) {
            return $this->startsOn >= $firstOfMonth && $this->startsOn <= $lastOfMonth;
        }

        if ($this->startsOn > $lastOfMonth) {
            return false;
        }

        return $this->endsOn === null || $this->endsOn >= $firstOfMonth;
    }
}
