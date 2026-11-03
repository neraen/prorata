<?php

declare(strict_types=1);

namespace App\Service\MealAssistant;

use App\Service\HouseholdService;
use App\Service\Food\FoodReference;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

final class FoodProfile
{
    public const CATEGORIES = ['everyday', 'balanced', 'pleasure', 'joker'];

    public static function defaults(): array
    {
        return ['servings' => 2, 'maxMinutes' => 30, 'weeklyBudgetCents' => null, 'diet' => 'omnivore', 'allergies' => [], 'dislikes' => [], 'favorites' => [], 'equipment' => [], 'habits' => '', 'jokerIdeas' => ['Raviolis en conserve', 'Pizza surgelée'], 'pantry' => []];
    }

    public static function normalize(mixed $input): array
    {
        if (!is_array($input)) self::invalid('Profil invalide.');
        $profile = array_replace(self::defaults(), $input);
        $result = [
            'servings' => self::integer($profile['servings'], 1, 20),
            'maxMinutes' => self::integer($profile['maxMinutes'], 5, 180),
            'weeklyBudgetCents' => $profile['weeklyBudgetCents'] === null ? null : self::integer($profile['weeklyBudgetCents'], 100, 1000000),
            'diet' => self::choice($profile['diet'], ['omnivore', 'vegetarian', 'pescatarian', 'vegan']),
            'habits' => self::text($profile['habits'], 2000, true),
        ];
        foreach (['allergies', 'dislikes', 'favorites', 'equipment', 'jokerIdeas'] as $field) $result[$field] = self::strings($profile[$field], 30, 120);
        if (!is_array($profile['pantry']) || !array_is_list($profile['pantry']) || count($profile['pantry']) > 200) self::invalid('Le stock est limité à 200 ingrédients.');
        $result['pantry'] = array_map(function ($item, $index) {
            if (!is_array($item)) self::invalid('Stock invalide.');
            $date = $item['expiresOn'] ?? null;
            return [...self::ingredient($item), 'expiresOn' => $date === null || $date === '' ? null : self::date($date), 'id' => self::text($item['id'] ?? 'legacy-'.substr(hash('sha256', json_encode([$index, $item], JSON_THROW_ON_ERROR)), 0, 24), 100)];
        }, $profile['pantry'], array_keys($profile['pantry']));
        return $result;
    }

    public static function ingredient(mixed $input): array
    {
        if (!is_array($input)) self::invalid('Ingrédient invalide.');
        $quantity = $input['quantity'] ?? null;
        if ((!is_int($quantity) && !is_float($quantity)) || !is_finite((float) $quantity) || $quantity < 0.001 || $quantity > 100000) self::invalid('Quantité invalide.');
        return ['name' => self::text($input['name'] ?? null, 100), 'quantity' => $quantity, 'unit' => self::choice($input['unit'] ?? null, HouseholdService::UNITS), 'aisle' => self::choice($input['aisle'] ?? null, HouseholdService::FOOD_AISLES), 'reference' => FoodReference::normalize($input['reference'] ?? null)];
    }

    public static function strings(mixed $value, int $count = 20, int $length = 500): array
    {
        if (!is_array($value) || !array_is_list($value) || count($value) > $count) self::invalid('Liste invalide.');
        return array_values(array_unique(array_map(fn ($v) => self::text($v, $length), $value)));
    }

    public static function text(mixed $value, int $max, bool $empty = false): string
    {
        if (!is_string($value) || (!$empty && trim($value) === '') || mb_strlen($value) > $max) self::invalid('Texte manquant ou trop long.');
        return trim($value);
    }

    public static function integer(mixed $value, int $min, int $max): int
    {
        if (!is_int($value) || $value < $min || $value > $max) self::invalid('Nombre hors limites.');
        return $value;
    }

    public static function choice(mixed $value, array $choices): string
    {
        if (!is_string($value) || !in_array($value, $choices, true)) self::invalid('Choix invalide.');
        return $value;
    }

    public static function date(mixed $value): string
    {
        if (!is_string($value)) self::invalid('Date invalide.');
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        if (!$date || $date->format('Y-m-d') !== $value) self::invalid('Date invalide.');
        return $value;
    }

    public static function fold(string $value): string
    {
        $value = mb_strtolower($value);
        return strtr($value, ['é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e', 'à' => 'a', 'â' => 'a', 'ä' => 'a', 'î' => 'i', 'ï' => 'i', 'ô' => 'o', 'ö' => 'o', 'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ç' => 'c', 'œ' => 'oe']);
    }

    private static function invalid(string $message): never { throw new BadRequestHttpException($message); }
}
