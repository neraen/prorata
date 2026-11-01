<?php

declare(strict_types=1);

namespace App\Service\MealAssistant;

use Doctrine\DBAL\Connection;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;
use Symfony\Component\Uid\Uuid;

class PantryPhotoService
{
    public function __construct(private Connection $connection, private MealAssistantService $ledger, private MealOpenAiClient $openAi) {}

    public function inspect(int $coupleId, int $userId, array $input): array
    {
        $id = $input['id'] ?? null;
        if (!is_string($id) || !Uuid::isValid($id)) throw new BadRequestHttpException('Identifiant invalide.');
        $image = $input['image'] ?? null;
        if (!is_string($image) || strlen($image) > 2800000 || !preg_match('~^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$~D', $image, $parts)) throw new BadRequestHttpException('Choisis une photo JPEG, PNG ou WebP de moins de 2 Mo.');
        $bytes = base64_decode($parts[2], true);
        $info = $bytes === false ? false : @getimagesizefromstring($bytes);
        if ($bytes === false || strlen($bytes) > 2000000 || !$info || ($info['mime'] ?? '') !== 'image/'.$parts[1] || $info[0] * $info[1] > 16000000) throw new BadRequestHttpException('Photo invalide ou trop grande. Choisis une autre image.');
        unset($bytes, $parts);
        if (!$this->openAi->enabled()) throw new ServiceUnavailableHttpException(null, 'L’analyse photo n’est pas encore configurée.');
        $hash = hash('sha256', $image);
        $row = $this->ledger->reserve($coupleId, $userId, $id, $hash, hash('sha256', ''), 'pantry-photo');
        if ($row !== null) {
            if ($row['status'] !== 'ready') throw new ConflictHttpException('Cette analyse est en cours ou a échoué. Lance une nouvelle analyse.');
            return json_decode($row['result'], true, 64, JSON_THROW_ON_ERROR);
        }
        try {
            $response = $this->openAi->inspectPantry($image);
            $this->connection->update('meal_assistant_run', ['model' => $response['model'], 'token_usage' => json_encode($response['usage'], JSON_THROW_ON_ERROR)], ['id' => $id, 'couple_id' => $coupleId]);
            $proposal = $response['proposal'];
            if (!is_array($proposal['items'] ?? null) || !array_is_list($proposal['items']) || count($proposal['items']) > 40) throw new \UnexpectedValueException('Invalid photo result');
            $items = [];
            foreach ($proposal['items'] as $item) {
                if (!is_array($item)) throw new \UnexpectedValueException('Invalid photo item');
                $ingredient = FoodProfile::ingredient([...$item, 'quantity' => $item['quantity'] ?? 1, 'reference' => null]);
                $items[] = [...$ingredient, 'quantity' => $item['quantity'] ?? null, 'confidence' => FoodProfile::choice($item['confidence'] ?? null, ['low', 'medium', 'high']), 'note' => FoodProfile::text($item['note'] ?? '', 500, true)];
            }
            $result = ['id' => $id, 'items' => $items, 'warnings' => FoodProfile::strings($proposal['warnings'] ?? [], 10, 500), 'model' => $response['model']];
            // Persist only the reviewed proposal metadata, never the photograph.
            $this->connection->update('meal_assistant_run', ['status' => 'ready', 'model' => $response['model'], 'result' => json_encode($result, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE), 'token_usage' => json_encode($response['usage'], JSON_THROW_ON_ERROR)], ['id' => $id, 'couple_id' => $coupleId]);
            return $result;
        } catch (\Throwable $error) {
            $this->connection->update('meal_assistant_run', ['status' => 'failed'], ['id' => $id, 'couple_id' => $coupleId]);
            if ($error instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface && !$error instanceof BadRequestHttpException) throw $error;
            throw new ServiceUnavailableHttpException(null, 'L’analyse de la photo est inutilisable. Essaie une photo plus nette.');
        }
    }
}
