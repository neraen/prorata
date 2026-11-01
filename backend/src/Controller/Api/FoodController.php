<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Service\Food\FoodSuggestions;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/foods')]
class FoodController extends AbstractApiController
{
    #[Route('/suggestions', name: 'api_food_suggestions', methods: ['GET'])]
    public function suggestions(Request $request, FoodSuggestions $suggestions): JsonResponse
    {
        $this->requireCouple();
        return new JsonResponse($suggestions->search($request->query->getString('q')), headers: ['Cache-Control' => 'private, no-store']);
    }
}
