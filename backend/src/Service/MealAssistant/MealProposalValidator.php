<?php

declare(strict_types=1);

namespace App\Service\MealAssistant;

use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;

final class MealProposalValidator
{
    public function request(array $input, array $state, string $today): array
    {
        $slots = $input['slots'] ?? null;
        if (!is_array($slots) || !array_is_list($slots) || count($slots) < 1 || count($slots) > 14) throw new BadRequestHttpException('Sélectionne entre 1 et 14 repas.');
        $max = (new \DateTimeImmutable($today))->modify('+90 days')->format('Y-m-d');
        $keys = [];
        $slots = array_map(function ($slot) use ($state, $today, $max, &$keys) {
            if (!is_array($slot)) throw new BadRequestHttpException('Créneau invalide.');
            $date = FoodProfile::date($slot['date'] ?? null);
            $part = FoodProfile::choice($slot['slot'] ?? null, ['lunch', 'dinner']);
            $key = $date.'-'.$part;
            if ($date < $today || $date > $max) throw new BadRequestHttpException('Choisis des repas entre aujourd’hui et les trois prochains mois.');
            if (isset($keys[$key]) || isset($state['meals'][$key])) throw new BadRequestHttpException('Un créneau est en double ou déjà planifié.');
            $keys[$key] = true;
            return ['date' => $date, 'slot' => $part];
        }, $slots);
        if (!is_array($input['mix'] ?? null)) throw new BadRequestHttpException('Répartition invalide.');
        $mix = [];
        foreach (FoodProfile::CATEGORIES as $category) $mix[$category] = FoodProfile::integer($input['mix'][$category] ?? 0, 0, 14);
        if (array_sum($mix) !== count($slots)) throw new BadRequestHttpException('La répartition doit correspondre au nombre de repas sélectionnés.');
        return ['slots' => $slots, 'mix' => $mix, 'instructions' => FoodProfile::text($input['instructions'] ?? '', 1500, true), 'servings' => FoodProfile::integer($input['servings'] ?? ($state['foodProfile']['servings'] ?? 2), 1, 20), 'budgetCents' => ($input['budgetCents'] ?? null) === null ? null : FoodProfile::integer($input['budgetCents'], 100, 1000000)];
    }

    public function proposal(array $data, array $request, array $context): array
    {
        try { return $this->validate($data, $request, $context); }
        catch (BadRequestHttpException) { throw new ServiceUnavailableHttpException(null, 'La proposition ne respecte pas toutes les contraintes. Reformule la demande ou réduis le nombre de repas.'); }
    }

    private function validate(array $data, array $request, array $context): array
    {
        $result = ['summary' => FoodProfile::text($data['summary'] ?? null, 1500)];
        foreach (['warnings', 'assumptions', 'questions'] as $key) $result[$key] = FoodProfile::strings($data[$key] ?? null, 12, 800);
        $result['optimizationTips'] = FoodProfile::strings($data['optimizationTips'] ?? null, 5, 800);
        if (!is_array($data['meals'] ?? null) || !array_is_list($data['meals']) || count($data['meals']) > 14) throw new BadRequestHttpException();
        if (!$data['meals']) {
            if (!$result['questions'] && !$result['warnings']) throw new BadRequestHttpException();
            return [...$result, 'meals' => []];
        }
        if (count($data['meals']) !== count($request['slots'])) throw new BadRequestHttpException();
        $expected = array_fill_keys(array_map(fn ($s) => $s['date'].'-'.$s['slot'], $request['slots']), true);
        $mix = array_fill_keys(FoodProfile::CATEGORIES, 0);
        $profile = $context['profile'];
        $recipes = array_column($context['retrievedRecipes'], null, 'id');
        $stockNames = array_column($profile['pantry'], 'name');
        $result['meals'] = [];
        foreach ($data['meals'] as $meal) {
            if (!is_array($meal)) throw new BadRequestHttpException();
            $date = FoodProfile::date($meal['date'] ?? null);
            $slot = FoodProfile::choice($meal['slot'] ?? null, ['lunch', 'dinner']);
            $key = $date.'-'.$slot;
            if (!isset($expected[$key])) throw new BadRequestHttpException();
            unset($expected[$key]);
            $category = FoodProfile::choice($meal['category'] ?? null, FoodProfile::CATEGORIES);
            ++$mix[$category];
            $id = $meal['existingRecipeId'] ?? null;
            if ($id !== null && (!is_string($id) || !isset($recipes[$id]))) throw new BadRequestHttpException();
            $recipe = $id === null ? $meal : $recipes[$id];
            if ($id !== null && ($recipe['categorySource'] ?? null) === 'user' && ($recipe['category'] ?? null) !== null && $recipe['category'] !== $category) throw new BadRequestHttpException('Le type choisi par le couple doit être conservé.');
            $title = FoodProfile::text($recipe['title'] ?? null, 150);
            $minutes = FoodProfile::integer($recipe['minutes'] ?? null, 1, $profile['maxMinutes']);
            $ingredients = $recipe['ingredients'] ?? null;
            if (!is_array($ingredients) || !array_is_list($ingredients) || count($ingredients) < 1 || count($ingredients) > 40) throw new BadRequestHttpException();
            $ingredients = array_map(FoodProfile::ingredient(...), $ingredients);
            $baseServings = FoodProfile::integer($recipe['servings'] ?? null, 1, 20);
            if ($id === null && $baseServings !== $profile['servings']) throw new BadRequestHttpException();
            if ($id !== null) {
                foreach ($ingredients as &$ingredient) $ingredient['quantity'] = round($ingredient['quantity'] * $profile['servings'] / $baseServings, 3);
                unset($ingredient);
            }
            if (self::hasRecipeConflict([...$recipe, 'ingredients' => $ingredients], $profile)) throw new BadRequestHttpException();
            $equipment = FoodProfile::strings(MealContextBuilder::requiredEquipment($recipe), 10, 80);
            // Exact equipment identifiers are supplied in the context.
            if ($profile['equipment'] && array_diff(array_map(FoodProfile::fold(...), $equipment), array_map(FoodProfile::fold(...), $profile['equipment']))) throw new BadRequestHttpException();
            if ($category === 'joker' && in_array('Four', $equipment, true) && $minutes < 10) throw new BadRequestHttpException('Le temps total du joker au four est incohérent.');
            $pantryUsed = FoodProfile::strings($meal['pantryUsed'] ?? null, 30, 100);
            if (array_diff($pantryUsed, $stockNames)) throw new BadRequestHttpException();
            foreach ($pantryUsed as $name) {
                if (!array_any($profile['pantry'], fn ($i) => $i['name'] === $name && ($i['expiresOn'] === null || $i['expiresOn'] >= $date))) throw new BadRequestHttpException();
            }
            $cost = $meal['estimatedCostCents'] ?? null;
            if ($cost !== null) $cost = FoodProfile::integer($cost, 0, 1000000);
            $result['meals'][] = ['date' => $date, 'slot' => $slot, 'category' => $category, 'existingRecipeId' => $id, 'title' => $title, 'servings' => $profile['servings'], 'minutes' => $minutes, 'equipment' => $equipment, 'ingredients' => $ingredients, 'instructions' => FoodProfile::text($recipe['instructions'] ?? '', 10000, $id !== null), 'reason' => FoodProfile::text($meal['reason'] ?? null, 800), 'pantryUsed' => $pantryUsed, 'estimatedCostCents' => $cost];
        }
        if ($expected || $mix !== $request['mix']) throw new BadRequestHttpException();
        $result['meals'] = $this->allocateStock($result['meals'], $profile, $result['warnings']);
        $costs = array_column($result['meals'], 'estimatedCostCents');
        if ($request['budgetCents'] !== null && !in_array(null, $costs, true) && array_sum($costs) > $request['budgetCents']) throw new BadRequestHttpException();
        if ($profile['allergies']) $result['warnings'][] = 'Vérifiez les étiquettes, allergènes et traces des produits choisis : une proposition IA ne garantit pas leur compatibilité.';
        $result['assumptions'][] = 'Coûts indicatifs, hors stock déclaré : les prix en magasin et les conditionnements ne sont pas vérifiés.';
        return $result;
    }


    private function allocateStock(array $meals, array $profile, array &$warnings): array
    {
        $pool = array_map(function ($item) {
            [$quantity, $unit] = $this->baseQuantity($item);
            return [...$item, 'remaining' => $quantity, 'baseUnit' => $unit];
        }, $profile['pantry']);
        usort($pool, fn ($a, $b) => strcmp($a['expiresOn'] ?? '9999-12-31', $b['expiresOn'] ?? '9999-12-31'));
        usort($meals, fn ($a, $b) => strcmp($a['date'], $b['date']) ?: (($a['slot'] === 'lunch' ? 0 : 1) <=> ($b['slot'] === 'lunch' ? 0 : 1)));
        $stockNotes = [];
        foreach ($meals as &$meal) {
            $meal['pantryUsed'] = [];
            $meal['pantryAllocations'] = [];
            foreach ($meal['ingredients'] as $ingredient) {
                [$required, $unit] = $this->baseQuantity($ingredient);
                $remaining = $required;
                $hadStock = false;
                foreach ($pool as &$item) {
                    if (FoodProfile::fold($item['name']) !== FoodProfile::fold($ingredient['name']) || $item['baseUnit'] !== $unit || ($item['expiresOn'] !== null && $item['expiresOn'] < $meal['date'])) continue;
                    $hadStock = true;
                    $used = min($item['remaining'], $remaining);
                    if ($used <= 0) continue;
                    $item['remaining'] -= $used;
                    $remaining -= $used;
                    $meal['pantryUsed'][] = $item['name'];
                    $meal['pantryAllocations'][] = ['name' => $item['name'], 'quantity' => round($used, 3), 'unit' => $unit];
                }
                unset($item);
                if ($hadStock && $remaining > 0.001) $stockNotes[] = $meal['date'].' : prévoir encore '.round($remaining, 3).' '.$unit.' de '.$ingredient['name'].' ; le stock a déjà été réparti entre les repas.';
            }
            $meal['pantryUsed'] = array_values(array_unique($meal['pantryUsed']));
        }
        unset($meal);
        $warnings = [...$warnings, ...array_slice($stockNotes, 0, 6)];
        return $meals;
    }

    private function baseQuantity(array $ingredient): array
    {
        return match ($ingredient['unit']) {
            'kg' => [$ingredient['quantity'] * 1000, 'g'],
            'l' => [$ingredient['quantity'] * 1000, 'ml'],
            default => [$ingredient['quantity'], $ingredient['unit']],
        };
    }

    /** Reject obvious conflicts; this is not a complete allergen or nutrition database. */
    public static function hasRecipeConflict(array $recipe, array $profile): bool
    {
        $diet = $recipe['diet'] ?? null;
        if ($diet !== null) {
            $allowed = match ($profile['diet']) {
                'vegan' => ['vegan'],
                'vegetarian' => ['vegan', 'vegetarian'],
                'pescatarian' => ['vegan', 'vegetarian', 'pescatarian'],
                default => ['vegan', 'vegetarian', 'pescatarian', 'omnivore'],
            };
            if (!in_array($diet, $allowed, true)) return true;
        }
        return self::hasObviousConflict($recipe['ingredients'], $profile);
    }

    public static function hasObviousConflict(array $ingredients, array $profile): bool
    {
        $groups = [
            'lait' => ['lait', 'beurre', 'creme', 'fromage', 'mozzarella', 'yaourt', 'parmesan', 'feta', 'reblochon', 'cheddar', 'emmental', 'comte', 'ricotta', 'mascarpone', 'gruyere'],
            'oeuf' => ['oeuf', 'oeufs', 'mayonnaise'],
            'arachide' => ['arachide', 'cacahuete', 'cacahuetes'],
            'gluten' => ['ble', 'orge', 'seigle', 'boulgour', 'couscous'],
            'fruits a coque' => ['noix', 'noisette', 'amande', 'pistache', 'cajou'],
            'soja' => ['soja', 'tofu', 'tempeh'],
            'sesame' => ['sesame', 'tahini'],
        ];
        $names = array_map(fn ($i) => FoodProfile::fold($i['name']), $ingredients);
        $forbidden = [];
        foreach ($profile['allergies'] as $allergy) {
            $allergy = FoodProfile::fold($allergy);
            $allergy = ['oeufs' => 'oeuf', 'arachides' => 'arachide', 'cacahuetes' => 'arachide', 'lactose' => 'lait', 'produits laitiers' => 'lait', 'fruits a coques' => 'fruits a coque'][$allergy] ?? $allergy;
            $forbidden = [...$forbidden, ...($groups[$allergy] ?? [$allergy])];
        }
        $meat = ['poulet', 'boeuf', 'porc', 'jambon', 'lardon', 'dinde', 'agneau', 'saucisse', 'chorizo', 'bacon', 'canard', 'veau'];
        $fish = ['poisson', 'thon', 'saumon', 'cabillaud', 'crevette', 'sardine', 'anchois', 'moule'];
        if (in_array($profile['diet'], ['vegetarian', 'vegan', 'pescatarian'], true)) $forbidden = [...$forbidden, ...$meat];
        if (in_array($profile['diet'], ['vegetarian', 'vegan'], true)) $forbidden = [...$forbidden, ...$fish];
        if ($profile['diet'] === 'vegan') $forbidden = [...$forbidden, ...$groups['lait'], ...$groups['oeuf'], 'miel'];
        foreach ($names as $name) foreach ($forbidden as $term) {
            if (in_array($term, ['lait', 'creme', 'yaourt', 'fromage', 'beurre'], true) && preg_match('/^'.preg_quote($term, '/').'\s+(?:(?:de |d[’\'])(?:coco|avoine|soja|amande|cacahuete)|vegetal)/u', $name)) continue;
            if (preg_match('/(?<!\p{L})'.preg_quote($term, '/').'(?:s)?(?!\p{L})/u', $name)) return true;
        }
        return false;
    }
}
