<?php

namespace App\Controller\Api;

use App\DTO\Request\ExpenseCreateRequest;
use App\DTO\Request\ExpenseUpdateRequest;
use App\DTO\Response\ErrorResponse;
use App\DTO\Response\ExpenseListResponse;
use App\DTO\Response\ExpenseResponse;
use App\Entity\Expense;
use App\Repository\ExpenseRepository;
use App\Repository\UserRepository;
use App\Service\ClosedMonthGuard;
use App\Service\CoupleContextService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/expenses')]
class ExpenseController extends AbstractApiController
{
    public function __construct(
        SerializerInterface $serializer,
        ValidatorInterface $validator,
        CoupleContextService $coupleContextService,
        private EntityManagerInterface $entityManager,
        private ExpenseRepository $expenseRepository,
        private UserRepository $userRepository,
        private ClosedMonthGuard $closedMonthGuard
    ) {
        parent::__construct($serializer, $validator, $coupleContextService);
    }

    #[Route('', name: 'api_expenses_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $couple = $this->requireCouple();

        $year = (int) $request->query->get('year', date('Y'));
        $month = (int) $request->query->get('month', date('n'));

        $expenses = $this->expenseRepository->findByMonth($couple, $year, $month);
        $isClosed = $this->closedMonthGuard->isClosed($couple, $year, $month);

        return $this->json(ExpenseListResponse::fromEntities($expenses, $isClosed));
    }

    #[Route('', name: 'api_expenses_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $couple = $this->requireCouple();

        $dto = $this->deserialize($request, ExpenseCreateRequest::class);

        if ($error = $this->validateAndReturn($dto)) {
            return $error;
        }

        // Parse date and check if month is closed
        $spentAt = new \DateTimeImmutable($dto->spentAt);
        $year = (int) $spentAt->format('Y');
        $month = (int) $spentAt->format('n');

        $this->closedMonthGuard->assertNotClosed($couple, $year, $month);

        // Find payer user
        $payer = $this->userRepository->find($dto->paidByUserId);
        if ($payer === null || !$couple->hasUser($payer)) {
            return $this->json(
                ErrorResponse::validation(['paidByUserId' => 'User is not member of this couple']),
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        // Create expense
        $expense = new Expense();
        $expense->setCouple($couple);
        $expense->setPaidBy($payer);
        $expense->setTitle($dto->title);
        $expense->setCategory($dto->category);
        $expense->setAmountCents($dto->amountCents);
        $expense->setCurrency($dto->currency);
        $expense->setSpentAt($spentAt);

        $this->entityManager->persist($expense);
        $this->entityManager->flush();

        return $this->json(ExpenseResponse::fromEntity($expense), Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'api_expenses_update', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $couple = $this->requireCouple();

        $expense = $this->expenseRepository->findByIdAndCouple($id, $couple);
        if ($expense === null) {
            throw $this->createNotFoundException('Expense not found');
        }

        $dto = $this->deserialize($request, ExpenseUpdateRequest::class);

        if ($error = $this->validateAndReturn($dto)) {
            return $error;
        }

        // Check if original month is closed
        $this->closedMonthGuard->assertNotClosed($couple, $expense->getYear(), $expense->getMonth());

        // If changing date, check new month is not closed
        if ($dto->spentAt !== null) {
            $newSpentAt = new \DateTimeImmutable($dto->spentAt);
            $newYear = (int) $newSpentAt->format('Y');
            $newMonth = (int) $newSpentAt->format('n');
            $this->closedMonthGuard->assertNotClosed($couple, $newYear, $newMonth);
            $expense->setSpentAt($newSpentAt);
        }

        // Update fields if provided
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

        if ($dto->paidByUserId !== null) {
            $payer = $this->userRepository->find($dto->paidByUserId);
            if ($payer === null || !$couple->hasUser($payer)) {
                return $this->json(
                    ErrorResponse::validation(['paidByUserId' => 'User is not member of this couple']),
                    Response::HTTP_UNPROCESSABLE_ENTITY
                );
            }
            $expense->setPaidBy($payer);
        }

        $this->entityManager->flush();

        return $this->json(ExpenseResponse::fromEntity($expense));
    }

    #[Route('/{id}', name: 'api_expenses_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $couple = $this->requireCouple();

        $expense = $this->expenseRepository->findByIdAndCouple($id, $couple);
        if ($expense === null) {
            throw $this->createNotFoundException('Expense not found');
        }

        // Check if month is closed
        $this->closedMonthGuard->assertNotClosed($couple, $expense->getYear(), $expense->getMonth());

        $this->entityManager->remove($expense);
        $this->entityManager->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }
}