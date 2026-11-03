<?php

declare(strict_types=1);

namespace App\Service\MealAssistant;

use App\Service\HouseholdService;
use Doctrine\DBAL\Connection;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Symfony\Component\Uid\Uuid;

class MealAssistantService
{
    public function __construct(
        private Connection $connection,
        private HouseholdService $household,
        private MealContextBuilder $contextBuilder,
        private MealProposalValidator $validator,
        private MealOpenAiClient $openAi,
        #[Autowire('%env(int:default:meal_assistant_daily_limit:OPENAI_MEAL_DAILY_LIMIT)%')] private int $dailyLimit,
    ) {}

    public function status(int $coupleId): array
    {
        $run = $this->connection->fetchAssociative("SELECT id, result, model, created_at, status, accepted_at FROM meal_assistant_run WHERE couple_id = ? AND purpose = 'plan' ORDER BY created_at DESC, id DESC LIMIT 1", [$coupleId]);
        return ['enabled' => $this->openAi->enabled(), 'model' => $this->openAi->model(), 'dailyLimit' => $this->dailyLimit, 'remaining' => max(0, $this->dailyLimit - $this->usedToday($coupleId)), 'draft' => $run && $run['status'] === 'ready' && $run['accepted_at'] === null ? ['id' => $run['id'], 'proposal' => $this->present(json_decode($run['result'], true, 64, JSON_THROW_ON_ERROR)), 'model' => $run['model'], 'createdAt' => $run['created_at']] : null];
    }

    public function generate(int $coupleId, int $userId, array $input): array
    {
        if (!$this->openAi->enabled()) throw new ServiceUnavailableHttpException(null, 'L’assistant n’est pas encore configuré sur le serveur.');
        $id = $input['id'] ?? '';
        if (!is_string($id) || !Uuid::isValid($id)) throw new BadRequestHttpException('Identifiant de demande invalide.');
        $hash = hash('sha256', json_encode($input, JSON_THROW_ON_ERROR));
        // A retry after a lost response returns the persisted draft, even though
        // its former slots may now have been accepted and no longer be empty.
        if ($existing = $this->connection->fetchAssociative('SELECT * FROM meal_assistant_run WHERE id = ? AND couple_id = ?', [$id, $coupleId])) return $this->replay($existing, $hash);
        $state = $this->household->read($coupleId);
        $today = (new \DateTimeImmutable('now', new \DateTimeZone('Europe/Paris')))->format('Y-m-d');
        $request = $this->validator->request($input, $state, $today);
        $context = $this->contextBuilder->build($state, $request, $today);
        $contextHash = $this->profileHash($state);
        $reserved = $this->reserve($coupleId, $userId, $id, $hash, $contextHash, 'plan');
        if ($reserved !== null) return $this->replay($reserved, $hash);
        try {
            $response = $this->openAi->generate($context, $request);
            $this->connection->update('meal_assistant_run', ['model' => $response['model'], 'token_usage' => json_encode($response['usage'], JSON_THROW_ON_ERROR)], ['id' => $id, 'couple_id' => $coupleId]);
            $proposal = $this->present($this->validator->proposal($response['proposal'], $request, $context));
            $proposal['recipeFingerprints'] = [];
            foreach ($proposal['meals'] as $meal) {
                if ($meal['existingRecipeId'] === null) continue;
                $recipe = array_find($state['recipes'], fn ($r) => $r['id'] === $meal['existingRecipeId']);
                $proposal['recipeFingerprints'][$recipe['id']] = hash('sha256', json_encode($recipe, JSON_THROW_ON_ERROR));
            }
            $proposal['context'] = ['retrievedRecipes' => array_map(fn ($r) => ['id' => $r['id'], 'title' => $r['title']], $context['retrievedRecipes']), 'recentMealsCount' => count($context['recentPlannedMeals']), 'pantryItemsCount' => count($context['profile']['pantry']), 'profileUsed' => true];
            $this->connection->update('meal_assistant_run', ['status' => 'ready', 'model' => $response['model'], 'result' => json_encode($proposal, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE), 'token_usage' => json_encode($response['usage'], JSON_THROW_ON_ERROR)], ['id' => $id, 'couple_id' => $coupleId]);
            return ['id' => $id, 'proposal' => $proposal, 'model' => $response['model'], 'createdAt' => gmdate('Y-m-d H:i:s')];
        } catch (\Throwable $error) {
            $this->connection->update('meal_assistant_run', ['status' => 'failed'], ['id' => $id, 'couple_id' => $coupleId]);
            throw $error;
        }
    }

    public function accept(int $coupleId, int $userId, string $id, bool $createShoppingList = false): array
    {
        return $this->connection->transactional(function () use ($coupleId, $userId, $id, $createShoppingList) {
            $this->connection->executeStatement('UPDATE couple SET household_revision = household_revision WHERE id = ?', [$coupleId]);
            $run = $this->connection->fetchAssociative('SELECT * FROM meal_assistant_run WHERE id = ? AND couple_id = ?', [$id, $coupleId]);
            if (!$run || ($run['purpose'] ?? 'plan') !== 'plan') throw new NotFoundHttpException('Proposition introuvable.');
            if ($run['accepted_at'] !== null) return $this->household->read($coupleId);
            if ($run['status'] !== 'ready') throw new ConflictHttpException('Cette proposition n’est pas prête.');
            $state = $this->household->read($coupleId);
            if ($run['context_hash'] !== $this->profileHash($state)) throw new ConflictHttpException('Vos préférences ou votre stock ont changé. Génère une nouvelle proposition.');
            $proposal = json_decode($run['result'], true, 64, JSON_THROW_ON_ERROR);
            foreach ($proposal['recipeFingerprints'] ?? [] as $recipeId => $hash) {
                $recipe = array_find($state['recipes'], fn ($r) => $r['id'] === $recipeId);
                if (!$recipe || !hash_equals($hash, hash('sha256', json_encode($recipe, JSON_THROW_ON_ERROR)))) throw new ConflictHttpException('Une recette utilisée a changé. Génère une nouvelle proposition.');
            }
            if (!$proposal['meals']) throw new BadRequestHttpException('La proposition ne contient aucun repas à planifier.');
            $profile = FoodProfile::normalize($state['foodProfile'] ?? []);
            foreach ($proposal['meals'] as $meal) {
                if (MealProposalValidator::hasObviousConflict($meal['ingredients'], $profile) || ($profile['equipment'] && array_diff(MealContextBuilder::requiredEquipment($meal), $profile['equipment'])) || ($meal['category'] === 'joker' && in_array('Four', $meal['equipment'], true) && $meal['minutes'] < 10)) throw new ConflictHttpException('Un repas ne correspond plus à vos contraintes ou à votre équipement. Génère une nouvelle proposition.');
            }

            $state = $this->household->execute($coupleId, $userId, ['id' => 'ai-accept-'.$id, 'type' => 'assistant.accept', 'payload' => ['runId' => $id, 'meals' => $proposal['meals']]], true);
            $this->connection->update('meal_assistant_run', ['accepted_at' => gmdate('Y-m-d H:i:s')], ['id' => $id, 'couple_id' => $coupleId]);
            if ($createShoppingList) {
                $weeks = [];
                foreach ($proposal['meals'] as $meal) {
                    $date = new \DateTimeImmutable($meal['date']);
                    $week = $date->modify('-'.((int) $date->format('N') - 1).' days')->format('Y-m-d');
                    $weeks[$week] = true;
                }
                foreach (array_keys($weeks) as $week) {
                    $state = $this->household->execute($coupleId, $userId, ['id' => 'ai-shopping-'.$id.'-'.$week, 'type' => 'shopping.generate', 'payload' => ['week' => $week]]);
                }
            }
            return $state;
        });
    }

    public function replace(int $coupleId, int $userId, string $id, array $input): array
    {
        return $this->connection->transactional(function () use ($coupleId, $id, $input) {
            $this->connection->executeStatement('UPDATE couple SET household_revision = household_revision WHERE id = ?', [$coupleId]);
            $run = $this->connection->fetchAssociative('SELECT * FROM meal_assistant_run WHERE id = ? AND couple_id = ?', [$id, $coupleId]);
            if (!$run || ($run['purpose'] ?? 'plan') !== 'plan') throw new NotFoundHttpException('Proposition introuvable.');
            if ($run['status'] !== 'ready' || $run['accepted_at'] !== null) throw new ConflictHttpException('Cette proposition ne peut plus être modifiée.');
            $state = $this->household->read($coupleId);
            if ($run['context_hash'] !== $this->profileHash($state)) throw new ConflictHttpException('Votre stock ou vos préférences ont changé. Prépare une nouvelle proposition.');
            $date = FoodProfile::date($input['date'] ?? null);
            $slot = FoodProfile::choice($input['slot'] ?? null, ['lunch', 'dinner']);
            $recipeId = FoodProfile::text($input['recipeId'] ?? null, 100);
            $recipe = array_find($state['recipes'], fn ($r) => $r['id'] === $recipeId);
            if (!$recipe) throw new BadRequestHttpException('Recette introuvable.');
            $proposal = json_decode($run['result'], true, 64, JSON_THROW_ON_ERROR);
            $found = false;
            foreach ($proposal['meals'] as &$meal) {
                if ($meal['date'] !== $date || $meal['slot'] !== $slot) continue;
                $found = true;
                $meal = [...$meal, 'existingRecipeId' => $recipeId, 'category' => $recipe['category'] ?? $meal['category'], 'pantryUsed' => [], 'estimatedCostCents' => null];
            }
            unset($meal);
            if (!$found) throw new BadRequestHttpException('Repas introuvable dans cette proposition.');
            $mix = array_fill_keys(FoodProfile::CATEGORIES, 0);
            foreach ($proposal['meals'] as $meal) ++$mix[$meal['category']];
            $request = $this->validator->request(['slots' => array_map(fn ($m) => ['date' => $m['date'], 'slot' => $m['slot']], $proposal['meals']), 'mix' => $mix, 'instructions' => '', 'servings' => $proposal['meals'][0]['servings']], $state, (new \DateTimeImmutable('now', new \DateTimeZone('Europe/Paris')))->format('Y-m-d'));
            $context = $this->contextBuilder->build($state, $request, gmdate('Y-m-d'));
            $ids = array_column($proposal['meals'], 'existingRecipeId');
            $context['retrievedRecipes'] = array_values(array_filter($state['recipes'], fn ($r) => in_array($r['id'], $ids, true)));
            // Advice about the replaced dish is no longer reliable. Rebuild
            // deterministic warnings from the current recipes and profile.
            foreach (['warnings', 'assumptions', 'questions', 'optimizationTips'] as $field) $proposal[$field] = [];
            $updated = $this->present($this->validator->proposal($proposal, $request, $context));
            $updated['context'] = $proposal['context'];
            $updated['summary'] = 'Vos propositions, avec les remplacements que vous avez choisis.';
            $updated['optimizationTips'] = [];
            $updated['warnings'][] = 'Après un remplacement, vérifiez les ingrédients, l’équipement et le budget de votre semaine. Les conseils de la première proposition ont été retirés.';
            $updated['warnings'] = array_values(array_unique($updated['warnings']));
            $updated['recipeFingerprints'] = [];
            foreach ($context['retrievedRecipes'] as $entry) $updated['recipeFingerprints'][$entry['id']] = hash('sha256', json_encode($entry, JSON_THROW_ON_ERROR));
            $this->connection->update('meal_assistant_run', ['result' => json_encode($updated, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)], ['id' => $id, 'couple_id' => $coupleId]);
            return ['id' => $id, 'proposal' => $updated, 'model' => $run['model'], 'createdAt' => $run['created_at']];
        });
    }

    public function reserve(int $coupleId, int $userId, string $id, string $hash, string $contextHash, string $purpose): ?array
    {
        return $this->connection->transactional(function () use ($coupleId, $userId, $id, $hash, $contextHash, $purpose) {
            // Taking the couple row's write lock serializes quota reservations.
            $this->connection->executeStatement('UPDATE couple SET household_revision = household_revision WHERE id = ?', [$coupleId]);
            if ($existing = $this->connection->fetchAssociative('SELECT * FROM meal_assistant_run WHERE id = ?', [$id])) {
                if ((int) $existing['couple_id'] !== $coupleId) throw new ConflictHttpException('Identifiant déjà utilisé.');
                if (($existing['purpose'] ?? 'plan') !== $purpose || !hash_equals($existing['request_hash'], $hash)) throw new ConflictHttpException('Identifiant déjà utilisé.');
                return $existing;
            }
            if ($this->usedToday($coupleId) >= $this->dailyLimit) throw new TooManyRequestsHttpException(3600, 'La limite quotidienne du couple est atteinte. Réessaie demain.');
            $this->connection->insert('meal_assistant_run', ['id' => $id, 'couple_id' => $coupleId, 'created_by_user_id' => $userId, 'status' => 'pending', 'model' => $this->openAi->model(), 'request_hash' => $hash, 'context_hash' => $contextHash, 'purpose' => $purpose, 'created_at' => gmdate('Y-m-d H:i:s')]);
            return null;
        });
    }

    private function replay(array $run, string $hash): array
    {
        if (($run['purpose'] ?? 'plan') !== 'plan') throw new ConflictHttpException('Identifiant déjà utilisé.');
        if (!hash_equals($run['request_hash'], $hash)) throw new ConflictHttpException('Cette demande a déjà été utilisée avec un autre contenu.');
        if ($run['status'] === 'pending') throw new ConflictHttpException('La proposition est déjà en cours de préparation.');
        if ($run['status'] !== 'ready') throw new ConflictHttpException('Cette demande a échoué. Lance une nouvelle proposition.');
        return ['id' => $run['id'], 'proposal' => $this->present(json_decode($run['result'], true, 64, JSON_THROW_ON_ERROR)), 'model' => $run['model'], 'createdAt' => $run['created_at']];
    }

    private function present(array $proposal): array
    {
        // A saved or planned recipe is not evidence of a positive rating.
        foreach ($proposal['meals'] as &$meal) {
            if ($meal['existingRecipeId'] !== null) $meal['reason'] = 'Une recette déjà présente dans votre bibliothèque, réutilisée pour cette sélection.';
        }
        unset($meal);
        return $proposal;
    }

    private function usedToday(int $coupleId): int
    {
        $start = (new \DateTimeImmutable('today', new \DateTimeZone('Europe/Paris')))->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        return (int) $this->connection->fetchOne('SELECT COUNT(*) FROM meal_assistant_run WHERE couple_id = ? AND created_at >= ?', [$coupleId, $start]);
    }

    private function profileHash(array $state): string
    {
        return hash('sha256', json_encode(FoodProfile::normalize($state['foodProfile'] ?? []), JSON_THROW_ON_ERROR));
    }
}
