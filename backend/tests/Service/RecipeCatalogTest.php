<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\RecipeCatalog;
use App\Service\MealAssistant\FoodProfile;
use App\Service\MealAssistant\MealProposalValidator;
use PHPUnit\Framework\TestCase;

class RecipeCatalogTest extends TestCase
{
    public function testCatalogHasUsableRecipesAcrossAllCategories(): void
    {
        $recipes = RecipeCatalog::recipes();
        self::assertCount(24, $recipes);
        self::assertCount(24, array_unique(array_column($recipes, 'id')));
        self::assertEqualsCanonicalizing(FoodProfile::CATEGORIES, array_values(array_unique(array_column($recipes, 'category'))));
        foreach ($recipes as $recipe) {
            self::assertSame('app', $recipe['source']);
            self::assertSame(2, $recipe['servings']);
            self::assertGreaterThanOrEqual(8, $recipe['minutes']);
            self::assertStringContainsString('1.', $recipe['instructions']);
            self::assertNotEmpty($recipe['equipment'] ?? [] ?: $recipe['ingredients']);
            self::assertContains($recipe['illustration'], ['pasta', 'bowl', 'skillet', 'oven', 'soup', 'quick']);
            foreach ($recipe['ingredients'] as $ingredient) self::assertSame($ingredient['name'], FoodProfile::ingredient($ingredient)['name']);
            self::assertArrayHasKey('diet', $recipe);
        }
    }

    public function testExistingCouplesReceiveRecipesWithoutLosingPersonalRecipesOrCategoryChoices(): void
    {
        $catalog = RecipeCatalog::recipes();
        $saved = [
            [...$catalog[0], 'category' => 'pleasure', 'categorySource' => 'user'],
            [...$catalog[1], 'category' => null, 'categorySource' => null],
            [...$catalog[2], 'id' => 'personal', 'source' => 'personal', 'authorId' => 12, 'title' => 'Ma recette'],
        ];
        $merged = RecipeCatalog::merge($saved);
        self::assertCount(25, $merged);
        self::assertSame('pleasure', array_find($merged, fn ($r) => $r['id'] === 'app-pasta')['category']);
        self::assertNull(array_find($merged, fn ($r) => $r['id'] === 'app-curry')['category']);
        self::assertSame('Ma recette', array_find($merged, fn ($r) => $r['id'] === 'personal')['title']);
        self::assertSame($merged, RecipeCatalog::merge($merged));
    }

    public function testCatalogDietMetadataExcludesPreparedFoodsOfUnknownOrAnimalComposition(): void
    {
        $profile = [...FoodProfile::defaults(), 'diet' => 'vegan'];
        $catalog = array_column(RecipeCatalog::recipes(), null, 'id');
        self::assertTrue(MealProposalValidator::hasRecipeConflict($catalog['app-pizza-frozen'], $profile));
        self::assertTrue(MealProposalValidator::hasRecipeConflict($catalog['app-ravioli-tin'], $profile));
        self::assertTrue(MealProposalValidator::hasRecipeConflict($catalog['app-lentil-salad'], $profile));
        self::assertFalse(MealProposalValidator::hasRecipeConflict($catalog['app-red-lentil-dal'], $profile));
    }
}
