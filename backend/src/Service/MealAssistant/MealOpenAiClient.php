<?php

declare(strict_types=1);

namespace App\Service\MealAssistant;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class MealOpenAiClient
{
    public function __construct(
        private HttpClientInterface $client,
        #[Autowire(env: 'default::OPENAI_API_KEY')] private ?string $apiKey,
        #[Autowire('%env(default:meal_assistant_model:OPENAI_MEAL_MODEL)%')] private string $model,
        #[Autowire('%kernel.project_dir%/resources/prompts/meal-assistant.fr.md')] private string $promptPath,
    ) {}

    public function enabled(): bool { return $this->apiKey !== null && trim($this->apiKey) !== ''; }
    public function model(): string { return $this->model; }

    public function generate(array $context, array $request): array
    {
        $instructions = file_get_contents($this->promptPath);
        if ($instructions === false) throw new \RuntimeException('Prompt de l’assistant introuvable.');
        return $this->structured($instructions, ['request' => $request, 'householdContext' => $context], MealProposalSchema::schema(), 'household_meal_proposal', 10000);
    }

    public function classify(array $recipe): array
    {
        $instructions = file_get_contents(dirname($this->promptPath).'/recipe-classifier.fr.md');
        if ($instructions === false) throw new \RuntimeException('Prompt de classement introuvable.');
        $schema = ['type' => 'object', 'properties' => ['category' => ['type' => ['string', 'null'], 'enum' => [...FoodProfile::CATEGORIES, null]], 'confidence' => ['type' => 'string', 'enum' => ['low', 'medium', 'high']], 'reason' => ['type' => 'string']], 'required' => ['category', 'confidence', 'reason'], 'additionalProperties' => false];
        return $this->structured($instructions, ['recipe' => $recipe], $schema, 'recipe_category', 700);
    }

    public function inspectPantry(string $image): array
    {
        $instructions = file_get_contents(dirname($this->promptPath).'/pantry-photo.fr.md');
        if ($instructions === false) throw new \RuntimeException('Prompt photo introuvable.');
        $item = ['type' => 'object', 'properties' => [
            'name' => ['type' => 'string'],
            'quantity' => ['type' => ['number', 'null']],
            'unit' => ['type' => 'string', 'enum' => \App\Service\HouseholdService::UNITS],
            'aisle' => ['type' => 'string', 'enum' => \App\Service\HouseholdService::AISLES],
            'confidence' => ['type' => 'string', 'enum' => ['low', 'medium', 'high']],
            'note' => ['type' => 'string'],
        ], 'required' => ['name', 'quantity', 'unit', 'aisle', 'confidence', 'note'], 'additionalProperties' => false];
        $schema = ['type' => 'object', 'properties' => ['items' => ['type' => 'array', 'maxItems' => 40, 'items' => $item], 'warnings' => ['type' => 'array', 'items' => ['type' => 'string']]], 'required' => ['items', 'warnings'], 'additionalProperties' => false];
        return $this->structured($instructions, ['task' => 'Identifier uniquement les aliments visibles sur cette photo, pour un inventaire à valider.'], $schema, 'pantry_photo', 4000, $image);
    }

    private function structured(string $instructions, array $input, array $schema, string $schemaName, int $maxTokens, ?string $image = null): array
    {
        if (!$this->enabled()) throw new ServiceUnavailableHttpException(null, 'L’assistant n’est pas encore configuré sur le serveur.');
        try {
            $response = $this->client->request('POST', 'https://api.openai.com/v1/responses', [
                'auth_bearer' => $this->apiKey,
                'json' => [
                    'model' => $this->model,
                    'store' => false,
                    'instructions' => $instructions,
                    'input' => $image === null ? json_encode($input, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE) : [['role' => 'user', 'content' => [['type' => 'input_text', 'text' => json_encode($input, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)], ['type' => 'input_image', 'image_url' => $image, 'detail' => 'high']]]],
                    'max_output_tokens' => $maxTokens,
                    'text' => ['format' => ['type' => 'json_schema', 'name' => $schemaName, 'strict' => true, 'schema' => $schema]],
                ],
                'timeout' => 75, 'max_duration' => 90,
            ]);
            $status = $response->getStatusCode();
            if ($status === 429) throw new ServiceUnavailableHttpException(60, 'Le service IA est momentanément limité. Réessaie un peu plus tard.');
            if ($status < 200 || $status >= 300) throw new ServiceUnavailableHttpException(null, 'Le service IA est indisponible. Vérifie sa configuration côté serveur.');
            $body = $response->toArray(false);
            if (($body['status'] ?? null) !== 'completed') throw new ServiceUnavailableHttpException(null, 'La proposition n’a pas pu être terminée. Essaie avec moins de repas.');
            $text = '';
            foreach ($body['output'] ?? [] as $item) {
                if (($item['type'] ?? '') !== 'message') continue;
                foreach ($item['content'] ?? [] as $content) {
                    if (($content['type'] ?? '') === 'refusal') throw new ServiceUnavailableHttpException(null, 'L’assistant ne peut pas proposer de plan avec cette demande. Précise tes contraintes.');
                    if (($content['type'] ?? '') === 'output_text') $text .= $content['text'];
                }
            }
            $proposal = json_decode($text, true, 64, JSON_THROW_ON_ERROR);
            if (!is_array($proposal)) throw new \JsonException('Invalid proposal');
            return ['proposal' => $proposal, 'model' => $body['model'] ?? $this->model, 'usage' => [
                'inputTokens' => (int) ($body['usage']['input_tokens'] ?? 0),
                'outputTokens' => (int) ($body['usage']['output_tokens'] ?? 0),
                'cachedInputTokens' => (int) ($body['usage']['input_tokens_details']['cached_tokens'] ?? 0),
            ]];
        } catch (ExceptionInterface | \JsonException) {
            // Never expose provider bodies, credentials or raw household context.
            throw new ServiceUnavailableHttpException(null, 'La réponse du service IA est inutilisable. Réessaie avec une demande plus simple.');
        }
    }
}
