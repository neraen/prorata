<?php

declare(strict_types=1);

namespace App\Tests\Service\MealAssistant;

use App\Service\HouseholdService;
use App\Service\MealAssistant\FoodProfile;
use App\Service\MealAssistant\MealContextBuilder;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class MealContextBuilderTest extends TestCase
{
    public function testRetrievalUsesStockAndHistoryWithoutInventingPreferences(): void
    {
        $state = HouseholdService::emptyState();
        $state['foodProfile'] = [...FoodProfile::defaults(), 'pantry' => [['name' => 'Tomates', 'quantity' => 500, 'unit' => 'g', 'aisle' => 'produce', 'expiresOn' => '2026-11-05']]];
        $state['meals'] = [
            'past' => ['date' => '2026-10-25', 'slot' => 'dinner', 'recipeId' => 'app-pasta', 'servings' => 2],
            'future' => ['date' => '2026-11-03', 'slot' => 'lunch', 'recipeId' => 'app-omelette', 'servings' => 2],
            'old' => ['date' => '2026-01-01', 'slot' => 'dinner', 'recipeId' => 'app-curry', 'servings' => 2],
        ];
        $context = (new MealContextBuilder())->build($state, ['instructions' => 'Des tomates', 'slots' => [['date' => '2026-11-02', 'slot' => 'dinner']]], '2026-11-01');
        self::assertSame('app-pasta', $context['retrievedRecipes'][0]['id']);
        self::assertCount(1, $context['recentPlannedMeals']);
        self::assertCount(1, $context['alreadyPlannedMeals']);
        self::assertSame([], $context['profile']['favorites']);
        self::assertStringNotContainsString('authorId', json_encode($context));
        self::assertArrayNotHasKey('user', $context);
    }

    public function testContextIncludesSecondDishInRecentAndAlreadyPlannedMeals(): void
    {
        $state = HouseholdService::emptyState();
        $state['meals'] = [
            'past' => ['date' => '2026-11-01', 'slot' => 'dinner', 'recipeId' => 'app-pasta', 'servings' => 2, 'extra' => ['recipeId' => 'app-curry', 'servings' => 1]],
            'future' => ['date' => '2026-11-06', 'slot' => 'lunch', 'recipeId' => 'app-pasta', 'servings' => 2, 'extra' => ['recipeId' => 'app-curry', 'servings' => 3]],
        ];
        $context = (new MealContextBuilder())->build($state, ['instructions' => '', 'slots' => [['date' => '2026-11-06', 'slot' => 'dinner']]], '2026-11-05');
        self::assertCount(1, $context['recentPlannedMeals']);
        self::assertSame('app-curry', $context['recentPlannedMeals'][0]['extra']['recipeId']);
        self::assertSame('Curry de pois chiches et épinards', $context['alreadyPlannedMeals'][0]['extra']['title']);
        self::assertSame(1, array_find($context['retrievedRecipes'], fn ($recipe) => $recipe['id'] === 'app-curry')['timesPlannedRecently']);
    }

    public function testObviousDietaryConflictsAreRemovedBeforeRetrieval(): void
    {
        $state = HouseholdService::emptyState();
        $state['foodProfile'] = [...FoodProfile::defaults(), 'diet' => 'vegan'];
        $context = (new MealContextBuilder())->build($state, ['instructions' => '', 'slots' => [['date' => '2026-11-02', 'slot' => 'dinner']]], '2026-11-01');
        self::assertContains('app-curry', array_column($context['retrievedRecipes'], 'id'));
        foreach (['app-pasta', 'app-omelette', 'app-lentil-salad', 'app-pizza-frozen', 'app-ravioli-tin'] as $id) self::assertNotContains($id, array_column($context['retrievedRecipes'], 'id'));
    }

    public function testRetrievalIsBoundedAndDoesNotSendTheEntireLibrary(): void
    {
        $state = HouseholdService::emptyState();
        $recipe = $state['recipes'][0];
        $state['recipes'] = [];
        for ($i = 0; $i < 40; ++$i) $state['recipes'][] = [...$recipe, 'id' => 'recipe-'.$i];
        $context = (new MealContextBuilder())->build($state, ['instructions' => '', 'slots' => [['date' => '2026-11-02', 'slot' => 'dinner']]], '2026-11-01');
        self::assertCount(16, $context['retrievedRecipes']);
    }

    public function testInvalidProfileQuantityIsRejected(): void
    {
        $this->expectException(BadRequestHttpException::class);
        FoodProfile::normalize(['pantry' => [['name' => 'Riz', 'quantity' => -1, 'unit' => 'g', 'aisle' => 'pantry']]]);
    }

    public function testUnknownProfileFieldsAreNotForwarded(): void
    {
        $profile = FoodProfile::normalize(['email' => 'secret@example.test', 'salary' => 4000]);
        self::assertArrayNotHasKey('email', $profile);
        self::assertArrayNotHasKey('salary', $profile);
    }
    public function testOldRecipeNeedingAnUnavailableBlenderIsNotRetrieved(): void
    {
        $state = HouseholdService::emptyState();
        $state['recipes'][] = [...$state['recipes'][0], 'id' => 'soup', 'title' => 'Soupe', 'instructions' => 'Cuire puis mixer les légumes.', 'equipment' => []];
        $state['foodProfile'] = [...FoodProfile::defaults(), 'equipment' => ['Four', 'Plaques de cuisson']];
        $context = (new MealContextBuilder())->build($state, ['instructions' => 'Une soupe', 'slots' => [['date' => '2026-11-02', 'slot' => 'dinner']]], '2026-11-01');
        self::assertNotContains('soup', array_column($context['retrievedRecipes'], 'id'));
        self::assertContains('Mixeur', MealContextBuilder::requiredEquipment(array_find($state['recipes'], fn ($r) => $r['id'] === 'soup')));
    }

}
