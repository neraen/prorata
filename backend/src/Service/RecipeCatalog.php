<?php

declare(strict_types=1);

namespace App\Service;

final class RecipeCatalog
{
    public static function recipes(): array
    {
        $recipes = [
            [
                'id' => 'app-pasta', 'title' => 'Pâtes aux tomates et mozzarella', 'servings' => 2, 'minutes' => 20,
                'source' => 'app', 'authorId' => 0,
                'instructions' => "1. Faire cuire les pâtes dans une casserole d’eau bouillante.\n2. Couper les tomates et les faire revenir avec l’huile d’olive.\n3. Mélanger les pâtes à la sauce et ajouter la mozzarella en morceaux.",
                'ingredients' => [
                    ['name' => 'Pâtes', 'quantity' => 200, 'unit' => 'g', 'aisle' => 'pantry'],
                    ['name' => 'Tomates', 'quantity' => 300, 'unit' => 'g', 'aisle' => 'produce'],
                    ['name' => 'Mozzarella', 'quantity' => 125, 'unit' => 'g', 'aisle' => 'dairy'],
                    ['name' => 'Huile d’olive', 'quantity' => 15, 'unit' => 'ml', 'aisle' => 'pantry'],
                ],
            ],
            [
                'id' => 'app-curry', 'title' => 'Curry de pois chiches et épinards', 'servings' => 2, 'minutes' => 25,
                'source' => 'app', 'authorId' => 0,
                'instructions' => "1. Faire cuire le riz selon les indications du paquet.\n2. Émincer l’oignon et le faire revenir avec l’huile. Ajouter le curry.\n3. Ajouter les pois chiches égouttés, le lait de coco et les épinards. Laisser mijoter 10 minutes.\n4. Servir avec le riz.",
                'ingredients' => [
                    ['name' => 'Riz', 'quantity' => 150, 'unit' => 'g', 'aisle' => 'pantry'],
                    ['name' => 'Pois chiches cuits', 'quantity' => 250, 'unit' => 'g', 'aisle' => 'pantry'],
                    ['name' => 'Lait de coco', 'quantity' => 200, 'unit' => 'ml', 'aisle' => 'pantry'],
                    ['name' => 'Épinards', 'quantity' => 200, 'unit' => 'g', 'aisle' => 'produce'],
                    ['name' => 'Oignon', 'quantity' => 1, 'unit' => 'piece', 'aisle' => 'produce'],
                    ['name' => 'Curry en poudre', 'quantity' => 5, 'unit' => 'g', 'aisle' => 'pantry'],
                    ['name' => 'Huile d’olive', 'quantity' => 15, 'unit' => 'ml', 'aisle' => 'pantry'],
                ],
            ],
            [
                'id' => 'app-omelette', 'title' => 'Omelette aux champignons', 'servings' => 2, 'minutes' => 15,
                'source' => 'app', 'authorId' => 0,
                'instructions' => "1. Nettoyer puis émincer les champignons. Les faire revenir avec l’huile.\n2. Battre les œufs et les verser sur les champignons.\n3. Cuire à feu doux jusqu’à la consistance souhaitée.",
                'ingredients' => [
                    ['name' => 'Œufs', 'quantity' => 4, 'unit' => 'piece', 'aisle' => 'dairy'],
                    ['name' => 'Champignons', 'quantity' => 250, 'unit' => 'g', 'aisle' => 'produce'],
                    ['name' => 'Huile d’olive', 'quantity' => 15, 'unit' => 'ml', 'aisle' => 'pantry'],
                ],
            ],
        ];
        $metadata = [
            'app-pasta' => ['diet' => 'vegetarian', 'category' => 'everyday', 'illustration' => 'pasta', 'equipment' => ['Plaques de cuisson']],
            'app-curry' => ['diet' => 'vegan', 'category' => 'balanced', 'illustration' => 'bowl', 'equipment' => ['Plaques de cuisson']],
            'app-omelette' => ['diet' => 'vegetarian', 'category' => 'everyday', 'illustration' => 'skillet', 'equipment' => ['Plaques de cuisson']],
        ];
        $recipes = array_map(fn ($recipe) => [...$recipe, ...$metadata[$recipe['id']], 'categorySource' => 'catalog'], $recipes);
        $extra = json_decode(file_get_contents(dirname(__DIR__, 2).'/resources/recipes/catalog.json'), true, 64, JSON_THROW_ON_ERROR);
        return [...$recipes, ...$extra];
    }

    /** Refresh app content for existing couples while keeping personal recipes and category choices. */
    public static function merge(array $saved): array
    {
        $catalog = array_column(self::recipes(), null, 'id');
        $merged = [];
        foreach ($saved as $recipe) {
            $id = $recipe['id'];
            if (isset($catalog[$id]) && ($recipe['source'] ?? null) === 'app') {
                $fresh = $catalog[$id];
                // An explicit null is also a choice to leave this recipe unclassified.
                if (array_key_exists('category', $recipe) && ($recipe['categorySource'] ?? null) !== 'catalog') {
                    foreach (['category', 'categorySource', 'categoryReason'] as $field) $fresh[$field] = $recipe[$field] ?? null;
                }
                $recipe = $fresh;
            }
            $merged[] = $recipe;
            unset($catalog[$id]);
        }
        return [...$merged, ...array_values($catalog)];
    }
}
