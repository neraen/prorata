<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Service\MealAssistant\MealAssistantService;
use App\Service\MealAssistant\RecipeClassificationService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/household/assistant')]
class MealAssistantController extends AbstractApiController
{
    #[Route('', name: 'api_meal_assistant_status', methods: ['GET'])]
    public function status(MealAssistantService $assistant): JsonResponse
    {
        return new JsonResponse($assistant->status($this->requireCouple()->getId()), headers: ['Cache-Control' => 'private, no-store']);
    }

    #[Route('/pantry-photo', name: 'api_pantry_photo', methods: ['POST'])]
    public function pantryPhoto(Request $request, \App\Service\MealAssistant\PantryPhotoService $photos): JsonResponse
    {
        $couple = $this->requireCouple();
        if (strlen($request->getContent()) > 2850000) throw new BadRequestHttpException('Photo trop volumineuse.');
        return new JsonResponse($photos->inspect($couple->getId(), $this->getCurrentUser()->getId(), $request->toArray()), headers: ['Cache-Control' => 'private, no-store']);
    }

    #[Route('/classify', name: 'api_recipe_classify', methods: ['POST'])]
    public function classify(Request $request, RecipeClassificationService $classifier): JsonResponse
    {
        $couple = $this->requireCouple();
        if (strlen($request->getContent()) > 50000) throw new BadRequestHttpException('Recette trop longue.');
        return new JsonResponse($classifier->classify($couple->getId(), $this->getCurrentUser()->getId(), $request->toArray()), headers: ['Cache-Control' => 'private, no-store']);
    }

    #[Route('/proposals', name: 'api_meal_assistant_generate', methods: ['POST'])]
    public function generate(Request $request, MealAssistantService $assistant): JsonResponse
    {
        $couple = $this->requireCouple();
        if (strlen($request->getContent()) > 12000) throw new BadRequestHttpException('Demande trop longue.');
        return new JsonResponse($assistant->generate($couple->getId(), $this->getCurrentUser()->getId(), $request->toArray()), headers: ['Cache-Control' => 'private, no-store']);
    }

    #[Route('/proposals/{id}/accept', name: 'api_meal_assistant_accept', methods: ['POST'])]
    public function accept(string $id, MealAssistantService $assistant): JsonResponse
    {
        $state = $assistant->accept($this->requireCouple()->getId(), $this->getCurrentUser()->getId(), $id);
        unset($state['appliedCommands']);
        $state['meals'] = (object) $state['meals'];
        return new JsonResponse($state, headers: ['Cache-Control' => 'private, no-store']);
    }
}
