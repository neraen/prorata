<?php

declare(strict_types=1);

namespace App\Service\MealAssistant;

use App\Service\HouseholdService;

final class MealProposalSchema
{
    public static function schema(): array
    {
        $text = ['type' => 'string'];
        $strings = ['type' => 'array', 'items' => $text];
        $ingredient = self::object([
            'name' => $text, 'quantity' => ['type' => 'number'],
            'unit' => ['type' => 'string', 'enum' => HouseholdService::UNITS],
            'aisle' => ['type' => 'string', 'enum' => HouseholdService::AISLES],
        ]);
        return self::object([
            'summary' => $text, 'warnings' => $strings, 'assumptions' => $strings,
            'optimizationTips' => $strings, 'questions' => $strings,
            'meals' => ['type' => 'array', 'items' => self::object([
                'date' => $text, 'slot' => ['type' => 'string', 'enum' => ['lunch', 'dinner']],
                'category' => ['type' => 'string', 'enum' => FoodProfile::CATEGORIES],
                'existingRecipeId' => ['type' => ['string', 'null']],
                'title' => $text, 'servings' => ['type' => 'integer'], 'minutes' => ['type' => 'integer'],
                'equipment' => $strings, 'ingredients' => ['type' => 'array', 'items' => $ingredient],
                'instructions' => $text, 'reason' => $text, 'pantryUsed' => $strings,
                'estimatedCostCents' => ['type' => ['integer', 'null']],
            ])],
        ]);
    }

    private static function object(array $properties): array
    {
        return ['type' => 'object', 'properties' => $properties, 'required' => array_keys($properties), 'additionalProperties' => false];
    }
}
