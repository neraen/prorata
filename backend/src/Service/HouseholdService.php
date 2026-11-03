<?php

declare(strict_types=1);

namespace App\Service;

use Doctrine\DBAL\Connection;
use App\Service\MealAssistant\FoodProfile;
use App\Service\Food\FoodReference;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/** Couple-scoped commands with optimistic concurrency and replay protection. */
class HouseholdService
{
    public const AISLES = ['produce', 'meat', 'dairy', 'pantry', 'frozen', 'other'];
    public const UNITS = ['g', 'kg', 'ml', 'l', 'piece'];

    public function __construct(private Connection $connection) {}

    public static function emptyState(): array
    {
        return ['recipes' => RecipeCatalog::recipes(), 'meals' => [], 'shopping' => [], 'appliedCommands' => [], 'foodProfile' => FoodProfile::defaults()];
    }

    public function read(int $coupleId): array
    {
        $row = $this->connection->fetchAssociative('SELECT household_data, household_revision FROM couple WHERE id = ?', [$coupleId]);
        if (!$row) {
            throw new BadRequestHttpException('Couple introuvable.');
        }
        $state = $row['household_data'] ? json_decode($row['household_data'], true, 512, JSON_THROW_ON_ERROR) : self::emptyState();
        $state = array_replace(self::emptyState(), $state);
        $state['recipes'] = RecipeCatalog::merge($state['recipes']);
        $state['foodProfile'] = FoodProfile::normalize($state['foodProfile']);
        $state['revision'] = (int) $row['household_revision'];
        return $state;
    }

    public function execute(int $coupleId, int $userId, array $command, bool $trusted = false): array
    {
        $this->text($command['id'] ?? null, 100);
        for ($attempt = 0; $attempt < 5; ++$attempt) {
            $state = $this->read($coupleId);
            if (in_array($command['id'], $state['appliedCommands'], true)) {
                return $state;
            }
            $revision = $state['revision'];
            unset($state['revision']);
            $state = $this->apply($state, $command, $userId, $trusted);
            $state['appliedCommands'] = array_slice([...$state['appliedCommands'], $command['id']], -200);
            $changed = $this->connection->executeStatement(
                'UPDATE couple SET household_data = ?, household_revision = household_revision + 1 WHERE id = ? AND household_revision = ?',
                [json_encode($state, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE), $coupleId, $revision]
            );
            if ($changed === 1) {
                $state['revision'] = $revision + 1;
                return $state;
            }
        }
        throw new ConflictHttpException('La liste a changé. Réessayez.');
    }

    public function apply(array $state, array $command, int $userId, bool $trusted = false): array
    {
        $payload = $command['payload'] ?? [];
        if (!is_array($payload)) {
            throw new BadRequestHttpException('Données invalides.');
        }
        switch ($command['type'] ?? '') {
            case 'pantry.import':
                $items = $payload['items'] ?? null;
                if (!is_array($items) || !array_is_list($items) || count($items) < 1 || count($items) > 40) throw new BadRequestHttpException('Sélectionne entre 1 et 40 aliments.');
                foreach ($items as $item) {
                    if (!is_array($item)) throw new BadRequestHttpException('Aliment invalide.');
                    $state = $this->apply($state, ['type' => 'pantry.save', 'payload' => $item], $userId);
                }
                break;
            case 'pantry.save':
                $profile = FoodProfile::normalize($state['foodProfile'] ?? []);
                $id = $this->text($payload['id'] ?? null, 100);
                $profile['pantry'] = array_values(array_filter($profile['pantry'], fn ($i) => $i['id'] !== $id));
                $profile['pantry'][] = [...$this->ingredient($payload), 'id' => $id, 'expiresOn' => ($payload['expiresOn'] ?? null) === null || $payload['expiresOn'] === '' ? null : $this->date($payload['expiresOn'])];
                $state['foodProfile'] = FoodProfile::normalize($profile);
                break;
            case 'pantry.remove':
                $profile = FoodProfile::normalize($state['foodProfile'] ?? []);
                $id = $this->text($payload['id'] ?? null, 100);
                $profile['pantry'] = array_values(array_filter($profile['pantry'], fn ($i) => $i['id'] !== $id));
                $state['foodProfile'] = $profile;
                break;
            case 'profile.preferences':
                $state['foodProfile'] = FoodProfile::normalize([...$payload, 'pantry' => $state['foodProfile']['pantry'] ?? []]);
                break;
            case 'profile.save':
                $state['foodProfile'] = FoodProfile::normalize($payload);
                break;
            case 'assistant.accept':
                if (!$trusted) throw new BadRequestHttpException('Cette action demande une proposition validée côté serveur.');
                foreach ($payload['meals'] as $index => $meal) {
                    $key = $meal['date'].'-'.$meal['slot'];
                    $today = (new \DateTimeImmutable('now', new \DateTimeZone('Europe/Paris')))->format('Y-m-d');
                    if ($meal['date'] < $today || isset($state['meals'][$key])) throw new ConflictHttpException('Un créneau est passé ou a été rempli. Génère une nouvelle proposition.');
                    $recipeId = $meal['existingRecipeId'];
                    if ($recipeId !== null && !array_any($state['recipes'], fn ($r) => $r['id'] === $recipeId)) throw new ConflictHttpException('Une recette a changé. Génère une nouvelle proposition.');
                    if ($recipeId === null) {
                        $recipeId = 'ai-'.$payload['runId'].'-'.$index;
                        $state = $this->apply($state, ['type' => 'recipe.save', 'payload' => [...$meal, 'id' => $recipeId]], $userId);
                        foreach ($state['recipes'] as &$recipe) {
                            if ($recipe['id'] === $recipeId) { $recipe['origin'] = 'ai'; $recipe['categorySource'] = 'ai'; $recipe['equipment'] = $meal['equipment']; }
                        }
                        unset($recipe);
                    }
                    $state['meals'][$key] = ['date' => $meal['date'], 'slot' => $meal['slot'], 'recipeId' => $recipeId, 'servings' => $meal['servings'], 'category' => $meal['category']];
                }
                break;
            case 'recipe.category':
                $id = $this->text($payload['id'] ?? null, 100);
                $found = false;
                foreach ($state['recipes'] as &$entry) {
                    if ($entry['id'] !== $id) continue;
                    $found = true;
                    $entry['category'] = ($payload['category'] ?? null) === null ? null : $this->choice($payload['category'], FoodProfile::CATEGORIES);
                    $entry['categorySource'] = $entry['category'] === null ? null : $this->choice($payload['categorySource'] ?? 'user', ['user', 'ai']);
                    $entry['categoryReason'] = isset($payload['categoryReason']) && $payload['categoryReason'] !== '' ? $this->text($payload['categoryReason'], 500) : null;
                }
                unset($entry);
                if (!$found) throw new BadRequestHttpException('Recette introuvable.');
                break;
            case 'recipe.save':
                $id = $this->text($payload['id'] ?? null, 100);
                $existing = array_find($state['recipes'], fn ($r) => $r['id'] === $id);
                if ($existing && $existing['authorId'] !== $userId) {
                    throw new BadRequestHttpException('Seul l’auteur peut modifier sa recette.');
                }
                $ingredients = $payload['ingredients'] ?? null;
                if (!is_array($ingredients) || count($ingredients) < 1 || count($ingredients) > 100) {
                    throw new BadRequestHttpException('Ajoutez entre 1 et 100 ingrédients.');
                }
                $recipe = [
                    'id' => $id,
                    'title' => $this->text($payload['title'] ?? null, 150),
                    'servings' => $this->number($payload['servings'] ?? null, 1, 20),
                    'minutes' => $this->number($payload['minutes'] ?? null, 1, 1440),
                    'instructions' => $this->text($payload['instructions'] ?? null, 10000),
                    'authorId' => $userId,
                    'source' => 'personal',
                    'category' => ($category = array_key_exists('category', $payload) ? $payload['category'] : ($existing['category'] ?? null)) === null ? null : $this->choice($category, FoodProfile::CATEGORIES),
                    'categorySource' => $category === null ? null : $this->choice($payload['categorySource'] ?? 'user', ['user', 'ai']),
                    'categoryReason' => isset($payload['categoryReason']) && $payload['categoryReason'] !== '' ? $this->text($payload['categoryReason'], 500) : null,
                    'equipment' => $existing['equipment'] ?? [],
                    'origin' => $existing['origin'] ?? null,
                    'ingredients' => array_map(fn ($i) => $this->ingredient($i), $ingredients),
                ];
                $state['recipes'] = array_values(array_filter($state['recipes'], fn ($r) => $r['id'] !== $id));
                $state['recipes'][] = $recipe;
                break;
            case 'meal.set':
                $date = $this->date($payload['date'] ?? null);
                $slot = $this->choice($payload['slot'] ?? null, ['lunch', 'dinner']);
                $key = $date.'-'.$slot;
                if (($payload['recipeId'] ?? null) === null) {
                    unset($state['meals'][$key]);
                    break;
                }
                $recipe = array_find($state['recipes'], fn ($r) => $r['id'] === $payload['recipeId']);
                if (!$recipe) {
                    throw new BadRequestHttpException('Recette introuvable.');
                }
                $state['meals'][$key] = ['date' => $date, 'slot' => $slot, 'recipeId' => $recipe['id'], 'servings' => $this->number($payload['servings'] ?? null, 1, 20), 'category' => $recipe['category'] ?? null];
                break;
            case 'shopping.generate':
                $start = $this->date($payload['week'] ?? null);
                $end = (new \DateTimeImmutable($start))->modify('+6 days')->format('Y-m-d');
                $generated = [];
                foreach ($state['meals'] as $meal) {
                    if ($meal['date'] < $start || $meal['date'] > $end) continue;
                    $recipe = array_find($state['recipes'], fn ($r) => $r['id'] === $meal['recipeId']);
                    if (!$recipe) continue;
                    foreach ($recipe['ingredients'] as $ingredient) {
                        $factor = $meal['servings'] / $recipe['servings'];
                        [$quantity, $unit] = match ($ingredient['unit']) {
                            'kg' => [$ingredient['quantity'] * 1000, 'g'],
                            'l' => [$ingredient['quantity'] * 1000, 'ml'],
                            default => [$ingredient['quantity'], $ingredient['unit']],
                        };
                        $key = 'week-'.$start.'-'.hash('sha256', mb_strtolower(trim($ingredient['name'])).'|'.$unit);
                        if (!isset($generated[$key])) {
                            $old = array_find($state['shopping'], fn ($i) => $i['id'] === $key);
                            $generated[$key] = [...$ingredient, 'id' => $key, 'unit' => $unit, 'quantity' => 0, 'checked' => $old['checked'] ?? false, 'week' => $start];
                        }
                        $generated[$key]['quantity'] += $quantity * $factor;
                    }
                }
                $previousShopping = $state['shopping'];
                $state['shopping'] = array_values(array_filter($state['shopping'], fn ($i) => ($i['week'] ?? null) !== $start));
                foreach ($generated as $item) {
                    $item['quantity'] = round($item['quantity'], 3);
                    $previous = array_find($previousShopping, fn ($i) => $i['id'] === $item['id']);
                    // An increased quantity needs another visit to the shelf.
                    if ($previous && $item['quantity'] > $previous['quantity']) $item['checked'] = false;
                    $state['shopping'][] = $item;
                }
                break;
            case 'shopping.add':
                $id = $this->text($payload['id'] ?? null, 100);
                if (array_any($state['shopping'], fn ($i) => $i['id'] === $id)) break;
                $state['shopping'][] = [...$this->ingredient($payload), 'id' => $id, 'checked' => false, 'week' => null];
                break;
            case 'shopping.check':
                $id = $this->text($payload['id'] ?? null, 150);
                if (!is_bool($payload['checked'] ?? null)) throw new BadRequestHttpException('État invalide.');
                $state['shopping'] = array_map(fn ($i) => $i['id'] === $id ? [...$i, 'checked' => $payload['checked']] : $i, $state['shopping']);
                break;
            case 'shopping.remove':
                $id = $this->text($payload['id'] ?? null, 150);
                $state['shopping'] = array_values(array_filter($state['shopping'], fn ($i) => $i['id'] !== $id));
                break;
            default:
                throw new BadRequestHttpException('Action inconnue.');
        }
        return $state;
    }

    private function ingredient(mixed $input): array
    {
        if (!is_array($input)) throw new BadRequestHttpException('Ingrédient invalide.');
        return [
            'name' => $this->text($input['name'] ?? null, 100),
            'quantity' => $this->number($input['quantity'] ?? null, 0.001, 100000),
            'unit' => $this->choice($input['unit'] ?? null, self::UNITS),
            'aisle' => $this->choice($input['aisle'] ?? null, self::AISLES),
            'reference' => FoodReference::normalize($input['reference'] ?? null),
        ];
    }

    private function text(mixed $value, int $max): string
    {
        if (!is_string($value) || trim($value) === '' || mb_strlen($value) > $max) throw new BadRequestHttpException('Texte manquant ou trop long.');
        return trim($value);
    }

    private function number(mixed $value, float $min, float $max): float
    {
        if ((!is_int($value) && !is_float($value)) || !is_finite((float) $value) || $value < $min || $value > $max) throw new BadRequestHttpException('Quantité hors limites.');
        return (float) $value;
    }

    private function choice(mixed $value, array $choices): string
    {
        if (!in_array($value, $choices, true)) throw new BadRequestHttpException('Choix invalide.');
        return $value;
    }

    private function date(mixed $value): string
    {
        if (!is_string($value)) throw new BadRequestHttpException('Date invalide.');
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        if (!$date || $date->format('Y-m-d') !== $value) throw new BadRequestHttpException('Date invalide.');
        return $value;
    }
}
