<?php

declare(strict_types=1);

namespace App\Service;

final class RecipeCatalog
{
    public static function recipes(): array
    {
        return [
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
    }
}
