<?php

namespace App\Entity;

use App\Repository\CoupleRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CoupleRepository::class)]
#[ORM\HasLifecycleCallbacks]
class Couple
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 20, enumType: CoupleMode::class)]
    private CoupleMode $mode = CoupleMode::EQUAL;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    /**
     * @var Collection<int, CoupleMember>
     */
    #[ORM\OneToMany(targetEntity: CoupleMember::class, mappedBy: 'couple', orphanRemoval: true, cascade: ['persist'])]
    #[ORM\OrderBy(['createdAt' => 'ASC'])]
    private Collection $members;

    /**
     * @var Collection<int, Expense>
     */
    #[ORM\OneToMany(targetEntity: Expense::class, mappedBy: 'couple', orphanRemoval: true)]
    private Collection $expenses;

    /**
     * @var Collection<int, MonthClosure>
     */
    #[ORM\OneToMany(targetEntity: MonthClosure::class, mappedBy: 'couple', orphanRemoval: true)]
    private Collection $closures;

    /**
     * @var Collection<int, CoupleInvite>
     */
    #[ORM\OneToMany(targetEntity: CoupleInvite::class, mappedBy: 'couple', orphanRemoval: true)]
    private Collection $invites;

    public function __construct()
    {
        $this->members = new ArrayCollection();
        $this->expenses = new ArrayCollection();
        $this->closures = new ArrayCollection();
        $this->invites = new ArrayCollection();
    }

    #[ORM\PrePersist]
    public function setCreatedAtValue(): void
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getMode(): CoupleMode
    {
        return $this->mode;
    }

    public function setMode(CoupleMode $mode): static
    {
        $this->mode = $mode;

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
     * @return Collection<int, CoupleMember>
     */
    public function getMembers(): Collection
    {
        return $this->members;
    }

    public function addMember(CoupleMember $member): static
    {
        if (!$this->members->contains($member)) {
            $this->members->add($member);
            $member->setCouple($this);
        }

        return $this;
    }

    public function removeMember(CoupleMember $member): static
    {
        if ($this->members->removeElement($member)) {
            if ($member->getCouple() === $this) {
                $member->setCouple(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Expense>
     */
    public function getExpenses(): Collection
    {
        return $this->expenses;
    }

    public function addExpense(Expense $expense): static
    {
        if (!$this->expenses->contains($expense)) {
            $this->expenses->add($expense);
            $expense->setCouple($this);
        }

        return $this;
    }

    public function removeExpense(Expense $expense): static
    {
        if ($this->expenses->removeElement($expense)) {
            if ($expense->getCouple() === $this) {
                $expense->setCouple(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, MonthClosure>
     */
    public function getClosures(): Collection
    {
        return $this->closures;
    }

    public function addClosure(MonthClosure $closure): static
    {
        if (!$this->closures->contains($closure)) {
            $this->closures->add($closure);
            $closure->setCouple($this);
        }

        return $this;
    }

    public function removeClosure(MonthClosure $closure): static
    {
        if ($this->closures->removeElement($closure)) {
            if ($closure->getCouple() === $this) {
                $closure->setCouple(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, CoupleInvite>
     */
    public function getInvites(): Collection
    {
        return $this->invites;
    }

    public function addInvite(CoupleInvite $invite): static
    {
        if (!$this->invites->contains($invite)) {
            $this->invites->add($invite);
            $invite->setCouple($this);
        }

        return $this;
    }

    public function removeInvite(CoupleInvite $invite): static
    {
        if ($this->invites->removeElement($invite)) {
            if ($invite->getCouple() === $this) {
                $invite->setCouple(null);
            }
        }

        return $this;
    }

    public function isFull(): bool
    {
        return $this->members->count() >= 2;
    }

    public function getMemberByUser(User $user): ?CoupleMember
    {
        foreach ($this->members as $member) {
            if ($member->getUser() === $user) {
                return $member;
            }
        }
        return null;
    }

    public function hasUser(User $user): bool
    {
        return $this->getMemberByUser($user) !== null;
    }

    /**
     * Get ordered members array [memberA, memberB]
     * @return CoupleMember[]
     */
    public function getOrderedMembers(): array
    {
        return $this->members->toArray();
    }
}