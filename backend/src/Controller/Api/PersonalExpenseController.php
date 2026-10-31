<?php

namespace App\Controller\Api;

use App\DTO\Request\PersonalExpenseCreateRequest;
use App\DTO\Request\PersonalExpenseUpdateRequest;
use App\DTO\Response\ErrorResponse;
use App\DTO\Response\PersonalExpenseResponse;
use App\Entity\PersonalExpense;
use App\Entity\Recurrence;
use App\Repository\PersonalExpenseRepository;
use App\Service\CoupleContextService;
use App\Service\PersonalMonthService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Personal expenses are private: every query is scoped to the current user,
 * and the partner never sees them.
 */
#[Route('/api/personal')]
class PersonalExpenseController extends AbstractApiController
{
    public function __construct(
        SerializerInterface $serializer,
        ValidatorInterface $validator,
        CoupleContextService $coupleContextService,
        private EntityManagerInterface $entityManager,
        private PersonalExpenseRepository $personalExpenseRepository,
        private PersonalMonthService $personalMonthService
    ) {
        parent::__construct($serializer, $validator, $coupleContextService);
    }

    /**
     * The whole "Perso" month: own expenses plus this member's share of the
     * couple's expenses, each with its own total.
     */
    #[Route('/month', name: 'api_personal_month', methods: ['GET'])]
    public function month(Request $request): JsonResponse
    {
        $user = $this->getCurrentUser();

        $year = (int) $request->query->get('year', date('Y'));
        $month = (int) $request->query->get('month', date('n'));

        return $this->json($this->personalMonthService->buildMonth($user, $year, $month));
    }

    #[Route('/expenses', name: 'api_personal_expenses_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->getCurrentUser();

        $dto = $this->deserialize($request, PersonalExpenseCreateRequest::class);

        if ($error = $this->validateAndReturn($dto)) {
            return $error;
        }

        $recurrence = Recurrence::from($dto->recurrence);
        $startsOn = new \DateTimeImmutable($dto->startsOn);
        $endsOn = $dto->endsOn !== null ? new \DateTimeImmutable($dto->endsOn) : null;

        if ($error = $this->validatePeriod($recurrence, $startsOn, $endsOn)) {
            return $error;
        }

        $expense = new PersonalExpense();
        $expense->setOwner($user);
        $expense->setTitle($dto->title);
        $expense->setCategory($dto->category);
        $expense->setAmountCents($dto->amountCents);
        $expense->setCurrency($dto->currency);
        $expense->setRecurrence($recurrence);
        $expense->setStartsOn($startsOn);
        $expense->setEndsOn($recurrence === Recurrence::MONTHLY ? $endsOn : null);

        $this->entityManager->persist($expense);
        $this->entityManager->flush();

        return $this->json(PersonalExpenseResponse::fromEntity($expense), Response::HTTP_CREATED);
    }

    #[Route('/expenses/{id}', name: 'api_personal_expenses_update', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $user = $this->getCurrentUser();

        $expense = $this->personalExpenseRepository->findByIdAndOwner($id, $user);
        if ($expense === null) {
            throw $this->createNotFoundException('Personal expense not found');
        }

        $dto = $this->deserialize($request, PersonalExpenseUpdateRequest::class);

        if ($error = $this->validateAndReturn($dto)) {
            return $error;
        }

        if ($dto->title !== null) {
            $expense->setTitle($dto->title);
        }

        if ($dto->category !== null) {
            $expense->setCategory($dto->category);
        }

        if ($dto->amountCents !== null) {
            $expense->setAmountCents($dto->amountCents);
        }

        if ($dto->currency !== null) {
            $expense->setCurrency($dto->currency);
        }

        if ($dto->recurrence !== null) {
            $expense->setRecurrence(Recurrence::from($dto->recurrence));
        }

        if ($dto->startsOn !== null) {
            $expense->setStartsOn(new \DateTimeImmutable($dto->startsOn));
        }

        if ($dto->clearEndsOn) {
            $expense->setEndsOn(null);
        } elseif ($dto->endsOn !== null) {
            $expense->setEndsOn(new \DateTimeImmutable($dto->endsOn));
        }

        // A one-off expense has no period to run over
        if (!$expense->isRecurring()) {
            $expense->setEndsOn(null);
        }

        if ($error = $this->validatePeriod($expense->getRecurrence(), $expense->getStartsOn(), $expense->getEndsOn())) {
            return $error;
        }

        $this->entityManager->flush();

        return $this->json(PersonalExpenseResponse::fromEntity($expense));
    }

    #[Route('/expenses/{id}', name: 'api_personal_expenses_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $user = $this->getCurrentUser();

        $expense = $this->personalExpenseRepository->findByIdAndOwner($id, $user);
        if ($expense === null) {
            throw $this->createNotFoundException('Personal expense not found');
        }

        $this->entityManager->remove($expense);
        $this->entityManager->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    private function validatePeriod(
        Recurrence $recurrence,
        \DateTimeImmutable $startsOn,
        ?\DateTimeImmutable $endsOn
    ): ?JsonResponse {
        if ($recurrence !== Recurrence::MONTHLY || $endsOn === null) {
            return null;
        }

        if ($endsOn < $startsOn) {
            return $this->json(
                ErrorResponse::validation(['endsOn' => 'End date must be after the start date']),
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        return null;
    }
}
