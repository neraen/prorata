<?php

namespace App\Controller\Api;

use App\DTO\Request\CloseMonthRequest;
use App\DTO\Response\BalanceResponse;
use App\DTO\Response\HistoryListResponse;
use App\Repository\MonthClosureRepository;
use App\Service\ClosedMonthGuard;
use App\Service\CoupleContextService;
use App\Service\MonthClosureService;
use App\Service\MonthlyBalanceService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/months')]
class MonthController extends AbstractApiController
{
    public function __construct(
        SerializerInterface $serializer,
        ValidatorInterface $validator,
        CoupleContextService $coupleContextService,
        private MonthlyBalanceService $monthlyBalanceService,
        private MonthClosureService $monthClosureService,
        private MonthClosureRepository $monthClosureRepository,
        private ClosedMonthGuard $closedMonthGuard
    ) {
        parent::__construct($serializer, $validator, $coupleContextService);
    }

    #[Route('/balance', name: 'api_months_balance', methods: ['GET'])]
    public function balance(Request $request): JsonResponse
    {
        $couple = $this->requireCouple();

        $year = (int) $request->query->get('year', date('Y'));
        $month = (int) $request->query->get('month', date('n'));

        $balance = $this->monthlyBalanceService->calculateBalance($couple, $year, $month);

        return $this->json($balance);
    }

    #[Route('/close', name: 'api_months_close', methods: ['POST'])]
    public function close(Request $request): JsonResponse
    {
        $couple = $this->requireCouple();

        $dto = $this->deserialize($request, CloseMonthRequest::class);

        if ($error = $this->validateAndReturn($dto)) {
            return $error;
        }

        $balance = $this->monthClosureService->closeMonth($couple, $dto->year, $dto->month);

        return $this->json($balance, Response::HTTP_CREATED);
    }

    #[Route('/history', name: 'api_months_history', methods: ['GET'])]
    public function history(): JsonResponse
    {
        $couple = $this->requireCouple();

        $closures = $this->monthClosureRepository->findAllByCouple($couple);

        return $this->json(HistoryListResponse::fromEntities($closures));
    }

    #[Route('/{year}/{month}', name: 'api_months_detail', methods: ['GET'], requirements: ['year' => '\d{4}', 'month' => '\d{1,2}'])]
    public function detail(int $year, int $month): JsonResponse
    {
        $couple = $this->requireCouple();

        // Validate month
        if ($month < 1 || $month > 12) {
            throw $this->createNotFoundException('Invalid month');
        }

        $balance = $this->monthlyBalanceService->calculateBalance($couple, $year, $month);

        return $this->json($balance);
    }
}