<?php

declare(strict_types=1);

namespace App\Service\MealAssistant;

use Doctrine\DBAL\Connection;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;
use Symfony\Component\Uid\Uuid;

class RecipeClassificationService
{
    public function __construct(private Connection $connection, private MealAssistantService $ledger, private MealOpenAiClient $openAi) {}

    public function classify(int $coupleId, int $userId, array $input): array
    {
        if (!$this->openAi->enabled()) throw new ServiceUnavailableHttpException(null, 'Le classement IA n’est pas encore configuré.');
        $id = $input['id'] ?? null;
        if (!is_string($id) || !Uuid::isValid($id)) throw new BadRequestHttpException('Identifiant invalide.');
        $recipe = $input['recipe'] ?? null;
        if (!is_array($recipe) || !is_array($recipe['ingredients'] ?? null) || !array_is_list($recipe['ingredients']) || count($recipe['ingredients']) < 1 || count($recipe['ingredients']) > 100) throw new BadRequestHttpException('Ajoute au moins un ingrédient avant de demander un classement.');
        $recipe = ['title' => FoodProfile::text($recipe['title'] ?? null, 150), 'servings' => FoodProfile::integer($recipe['servings'] ?? null, 1, 20), 'minutes' => FoodProfile::integer($recipe['minutes'] ?? null, 1, 1440), 'instructions' => FoodProfile::text($recipe['instructions'] ?? '', 10000, true), 'ingredients' => array_map(FoodProfile::ingredient(...), $recipe['ingredients'])];
        $hash = hash('sha256', json_encode($recipe, JSON_THROW_ON_ERROR));
        $row = $this->ledger->reserve($coupleId, $userId, $id, $hash, hash('sha256', ''), 'classification');
        if ($row !== null) {
            if ($row['status'] !== 'ready') throw new ConflictHttpException('Ce classement est en cours ou a échoué. Lance une nouvelle demande.');
            return json_decode($row['result'], true, 64, JSON_THROW_ON_ERROR);
        }
        try {
            $response = $this->openAi->classify($recipe);
            $this->connection->update('meal_assistant_run', ['model' => $response['model'], 'token_usage' => json_encode($response['usage'], JSON_THROW_ON_ERROR)], ['id' => $id, 'couple_id' => $coupleId]);
            $suggestion = $response['proposal'];
            $category = ($suggestion['category'] ?? null) === null ? null : FoodProfile::choice($suggestion['category'], FoodProfile::CATEGORIES);
            $confidence = FoodProfile::choice($suggestion['confidence'] ?? null, ['low', 'medium', 'high']);
            $reason = FoodProfile::text($suggestion['reason'] ?? null, 500);
            $result = ['id' => $id, 'category' => $confidence === 'low' ? null : $category, 'confidence' => $confidence, 'reason' => $reason, 'model' => $response['model']];
            $this->connection->update('meal_assistant_run', ['status' => 'ready', 'result' => json_encode($result, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)], ['id' => $id, 'couple_id' => $coupleId]);
            return $result;
        } catch (\Throwable $error) {
            $this->connection->update('meal_assistant_run', ['status' => 'failed'], ['id' => $id, 'couple_id' => $coupleId]);
            throw $error;
        }
    }
}
