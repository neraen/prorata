<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Service\HouseholdService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/household')]
class HouseholdController extends AbstractApiController
{
    #[Route('', name: 'api_household_read', methods: ['GET'])]
    public function read(HouseholdService $household): JsonResponse
    {
        return $this->response($household->read($this->requireCouple()->getId()));
    }

    #[Route('/commands', name: 'api_household_command', methods: ['POST'])]
    public function command(Request $request, HouseholdService $household): JsonResponse
    {
        $couple = $this->requireCouple();
        return $this->response($household->execute($couple->getId(), $this->getCurrentUser()->getId(), $request->toArray()));
    }

    private function response(array $state): JsonResponse
    {
        $state = \App\Service\HouseholdService::publicState($state);
        // An empty PHP map must stay an object in the client contract.
        $state['meals'] = (object) $state['meals'];
        return new JsonResponse($state, headers: ['Cache-Control' => 'private, no-store']);
    }
}
