<?php

namespace App\Controller\Api;

use App\DTO\Request\TransferCreateRequest;
use App\DTO\Request\TransferUpdateRequest;
use App\DTO\Response\ErrorResponse;
use App\DTO\Response\TransferListResponse;
use App\DTO\Response\TransferResponse;
use App\Entity\Couple;
use App\Entity\Transfer;
use App\Entity\User;
use App\Repository\TransferRepository;
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

#[Route('/api/transfers')]
class TransferController extends AbstractApiController
{
    public function __construct(
        SerializerInterface $serializer,
        ValidatorInterface $validator,
        CoupleContextService $coupleContextService,
        private EntityManagerInterface $entityManager,
        private TransferRepository $transferRepository,
        private UserRepository $userRepository,
        private ClosedMonthGuard $closedMonthGuard
    ) {
        parent::__construct($serializer, $validator, $coupleContextService);
    }

    /**
     * Lists transfers for a given month, or all of them when no month is given.
     */
    #[Route('', name: 'api_transfers_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $couple = $this->requireCouple();

        $year = $request->query->get('year');
        $month = $request->query->get('month');

        $transfers = ($year !== null && $month !== null)
            ? $this->transferRepository->findByMonth($couple, (int) $year, (int) $month)
            : $this->transferRepository->findAllByCouple($couple);

        return $this->json(TransferListResponse::fromEntities($transfers));
    }

    #[Route('', name: 'api_transfers_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $couple = $this->requireCouple();

        $dto = $this->deserialize($request, TransferCreateRequest::class);

        if ($error = $this->validateAndReturn($dto)) {
            return $error;
        }

        $transferredAt = new \DateTimeImmutable($dto->transferredAt);
        $this->closedMonthGuard->assertNotClosed(
            $couple,
            (int) $transferredAt->format('Y'),
            (int) $transferredAt->format('n')
        );

        $fromUser = $this->resolveMember($couple, $dto->fromUserId);
        $toUser = $this->resolveMember($couple, $dto->toUserId);

        if ($error = $this->validateParties($fromUser, $toUser)) {
            return $error;
        }

        $transfer = new Transfer();
        $transfer->setCouple($couple);
        $transfer->setFromUser($fromUser);
        $transfer->setToUser($toUser);
        $transfer->setAmountCents($dto->amountCents);
        $transfer->setCurrency($dto->currency);
        $transfer->setTransferredAt($transferredAt);
        $transfer->setNote($dto->note);

        $this->entityManager->persist($transfer);
        $this->entityManager->flush();

        return $this->json(TransferResponse::fromEntity($transfer), Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'api_transfers_update', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $couple = $this->requireCouple();

        $transfer = $this->transferRepository->findByIdAndCouple($id, $couple);
        if ($transfer === null) {
            throw $this->createNotFoundException('Transfer not found');
        }

        $dto = $this->deserialize($request, TransferUpdateRequest::class);

        if ($error = $this->validateAndReturn($dto)) {
            return $error;
        }

        $this->closedMonthGuard->assertNotClosed($couple, $transfer->getYear(), $transfer->getMonth());

        if ($dto->transferredAt !== null) {
            $newTransferredAt = new \DateTimeImmutable($dto->transferredAt);
            $this->closedMonthGuard->assertNotClosed(
                $couple,
                (int) $newTransferredAt->format('Y'),
                (int) $newTransferredAt->format('n')
            );
            $transfer->setTransferredAt($newTransferredAt);
        }

        $fromUser = $dto->fromUserId !== null
            ? $this->resolveMember($couple, $dto->fromUserId)
            : $transfer->getFromUser();
        $toUser = $dto->toUserId !== null
            ? $this->resolveMember($couple, $dto->toUserId)
            : $transfer->getToUser();

        if ($error = $this->validateParties($fromUser, $toUser)) {
            return $error;
        }

        $transfer->setFromUser($fromUser);
        $transfer->setToUser($toUser);

        if ($dto->amountCents !== null) {
            $transfer->setAmountCents($dto->amountCents);
        }

        if ($dto->currency !== null) {
            $transfer->setCurrency($dto->currency);
        }

        if ($dto->note !== null) {
            $transfer->setNote($dto->note);
        }

        $this->entityManager->flush();

        return $this->json(TransferResponse::fromEntity($transfer));
    }

    #[Route('/{id}', name: 'api_transfers_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $couple = $this->requireCouple();

        $transfer = $this->transferRepository->findByIdAndCouple($id, $couple);
        if ($transfer === null) {
            throw $this->createNotFoundException('Transfer not found');
        }

        $this->closedMonthGuard->assertNotClosed($couple, $transfer->getYear(), $transfer->getMonth());

        $this->entityManager->remove($transfer);
        $this->entityManager->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    private function validateParties(?User $fromUser, ?User $toUser): ?JsonResponse
    {
        if ($fromUser === null) {
            return $this->json(
                ErrorResponse::validation(['fromUserId' => 'User is not member of this couple']),
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        if ($toUser === null) {
            return $this->json(
                ErrorResponse::validation(['toUserId' => 'User is not member of this couple']),
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        if ($fromUser->getId() === $toUser->getId()) {
            return $this->json(
                ErrorResponse::validation(['toUserId' => 'Sender and recipient must be different']),
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        return null;
    }

    private function resolveMember(Couple $couple, ?int $userId): ?User
    {
        if ($userId === null) {
            return null;
        }

        $user = $this->userRepository->find($userId);

        return $user !== null && $couple->hasUser($user) ? $user : null;
    }
}
