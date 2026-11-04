<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Service\HouseholdService;
use App\Service\PersonalTasks;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/tasks')]
class PersonalTaskController extends AbstractApiController
{
    #[Route('', name: 'api_personal_tasks_read', methods: ['GET'])]
    public function read(HouseholdService $household): JsonResponse
    {
        return $this->response($household->read($this->requireCouple()->getId()));
    }

    #[Route('/commands', name: 'api_personal_tasks_command', methods: ['POST'])]
    public function command(Request $request, HouseholdService $household): JsonResponse
    {
        if (strlen($request->getContent()) > 4000) throw new BadRequestHttpException('Demande trop longue.');
        $command = $request->toArray();
        if (!in_array($command['type'] ?? null, ['task.add', 'task.set', 'task.archive'], true)) throw new BadRequestHttpException('Action inconnue.');
        return $this->response($household->execute($this->requireCouple()->getId(), $this->getCurrentUser()->getId(), $command));
    }

    private function response(array $state): JsonResponse
    {
        return new JsonResponse(['items' => PersonalTasks::visible($state['personalTasks'] ?? [], $this->getCurrentUser()->getId())], headers: ['Cache-Control' => 'private, no-store']);
    }
}
