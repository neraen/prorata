<?php

declare(strict_types=1);

namespace App\Service\MealAssistant;

final class MealContextBuilder
{
    /** Local retrieval: only the authenticated couple's data, scored and bounded. */
    public function build(array $state, array $request, string $today): array
    {
        $profile = FoodProfile::normalize($state['foodProfile'] ?? []);
        if (isset($request['servings'])) $profile['servings'] = FoodProfile::integer($request['servings'], 1, 20);
        $recentStart = (new \DateTimeImmutable($today))->modify('-42 days')->format('Y-m-d');
        $history = array_values(array_filter($state['meals'], fn ($m) => $m['date'] >= $recentStart && $m['date'] < $today));
        usort($history, fn ($a, $b) => strcmp($b['date'], $a['date']));
        $history = array_slice($history, 0, 60);
        $frequency = array_count_values(array_column($history, 'recipeId'));
        $search = FoodProfile::fold($request['instructions'].' '.implode(' ', $profile['favorites']).' '.implode(' ', array_column($profile['pantry'], 'name')));
        $terms = array_unique(array_filter(preg_split('/[^\p{L}\p{N}]+/u', $search), fn ($t) => mb_strlen($t) > 2));
        $ranked = [];
        foreach ($state['recipes'] as $recipe) {
            if (count($recipe['ingredients']) > 40 || MealProposalValidator::hasObviousConflict($recipe['ingredients'], $profile)) continue;
            $recipe['equipment'] = self::requiredEquipment($recipe);
            if ($profile['equipment'] && array_diff($recipe['equipment'], $profile['equipment'])) continue;
            $body = FoodProfile::fold($recipe['title'].' '.implode(' ', array_column($recipe['ingredients'], 'name')));
            $score = ($recipe['source'] === 'personal' ? 4 : 0) + ($recipe['minutes'] <= $profile['maxMinutes'] ? 2 : 0);
            foreach ($terms as $term) if (str_contains($body, $term)) $score += 3;
            // Past use signals familiarity; the prompt separately avoids repetition.
            $score += min(3, $frequency[$recipe['id']] ?? 0);
            $ranked[] = ['score' => $score, 'recipe' => $recipe];
        }
        usort($ranked, fn ($a, $b) => $b['score'] <=> $a['score'] ?: strcmp($a['recipe']['id'], $b['recipe']['id']));
        $recipes = array_map(function ($entry) use ($frequency) {
            $r = $entry['recipe'];
            return ['id' => $r['id'], 'title' => $r['title'], 'servings' => $r['servings'], 'minutes' => $r['minutes'], 'category' => $r['category'] ?? null, 'categorySource' => $r['categorySource'] ?? (($r['category'] ?? null) !== null ? (($r['origin'] ?? null) === 'ai' ? 'ai' : 'user') : null), 'ingredients' => $r['ingredients'], 'instructions' => mb_substr($r['instructions'], 0, 3000), 'equipment' => self::requiredEquipment($r), 'timesPlannedRecently' => $frequency[$r['id']] ?? 0];
        }, array_slice($ranked, 0, 16));
        $knownTitles = array_column($state['recipes'], 'title', 'id');
        $history = array_map(fn ($m) => ['date' => $m['date'], 'slot' => $m['slot'], 'title' => $knownTitles[$m['recipeId']] ?? 'Recette retirée', 'recipeId' => $m['recipeId']], $history);
        $start = min(array_column($request['slots'], 'date'));
        $end = (new \DateTimeImmutable(max(array_column($request['slots'], 'date'))))->modify('+2 days')->format('Y-m-d');
        $planned = array_values(array_filter($state['meals'], fn ($m) => $m['date'] >= $start && $m['date'] <= $end));
        $planned = array_map(fn ($m) => [...$m, 'title' => $knownTitles[$m['recipeId']] ?? 'Recette retirée'], $planned);
        return [
            'today' => $today, 'locale' => 'fr-FR', 'currency' => 'EUR',
            'profile' => $profile,
            'retrievedRecipes' => $recipes,
            'recentPlannedMeals' => $history,
            'alreadyPlannedMeals' => $planned,
            'evidenceLimits' => ['Un repas planifié ne prouve pas qu’il a été consommé ou apprécié.', 'Le stock est déclaré, sans suivi automatique des consommations.', 'Les données de prix et les valeurs nutritionnelles ne sont pas connectées.'],
        ];
    }
    /** Best-effort extraction for older recipes with no equipment metadata. */
    public static function requiredEquipment(array $recipe): array
    {
        $equipment = FoodProfile::strings($recipe['equipment'] ?? [], 10, 80);
        $text = FoodProfile::fold(($recipe['title'] ?? '').' '.($recipe['instructions'] ?? ''));
        foreach ([
            'Mixeur' => '/\\b(mixer|mixeur|blender)\\b/u',
            'Four' => '/\\b(four|enfourner|enfournez)\\b/u',
            'Micro-ondes' => '/micro[ -]ondes/u',
            'Air fryer' => '/air[ -]?fryer/u',
            'Plaques de cuisson' => '/\\b(poele|casserole|sauteuse|bouillir)\\b/u',
        ] as $name => $pattern) if (preg_match($pattern, $text)) $equipment[] = $name;
        return array_values(array_unique($equipment));
    }

}
