<?php

declare(strict_types=1);

namespace App\Service\Food;

use App\Service\MealAssistant\FoodProfile;

final class FoodReference
{
    public static function normalize(mixed $value): ?array
    {
        if ($value === null) return null;
        if (!is_array($value)) throw new \Symfony\Component\HttpKernel\Exception\BadRequestHttpException('Référence alimentaire invalide.');
        return ['source' => FoodProfile::choice($value['source'] ?? null, ['openfoodfacts']), 'type' => FoodProfile::choice($value['type'] ?? null, ['ingredient', 'product']), 'id' => FoodProfile::text($value['id'] ?? null, 200)];
    }
}
