<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\HouseholdService;
use App\Service\MealAssistant\FoodProfile;
use Doctrine\DBAL\DriverManager;
use PHPUnit\Framework\TestCase;

class PantryAndCategoriesTest extends TestCase
{
    private function service(): HouseholdService
    {
        $db = DriverManager::getConnection(['driver' => 'pdo_sqlite', 'memory' => true]);
        $db->executeStatement('CREATE TABLE couple (id INTEGER PRIMARY KEY, household_data TEXT, household_revision INTEGER DEFAULT 0 NOT NULL)');
        $db->executeStatement('INSERT INTO couple (id) VALUES (1),(2)');
        return new HouseholdService($db);
    }

    private function recipe(): array { return ['id' => 'recipe', 'title' => 'Mon plat', 'minutes' => 20, 'servings' => 2, 'instructions' => 'Cuire et servir.', 'ingredients' => [['name' => 'Mon ingrédient libre', 'quantity' => 1, 'unit' => 'piece', 'aisle' => 'other']]]; }

    public function testARecipeCanRemainUnclassifiedAndUserCanOverrideAi(): void
    {
        $service = $this->service();
        $state = $service->execute(1, 7, ['id' => 'one', 'type' => 'recipe.save', 'payload' => $this->recipe()]);
        self::assertNull(array_find($state['recipes'], fn ($r) => $r['id'] === 'recipe')['category']);
        $service->execute(1, 7, ['id' => 'two', 'type' => 'recipe.save', 'payload' => [...$this->recipe(), 'category' => 'joker', 'categorySource' => 'ai']]);
        $state = $service->execute(1, 7, ['id' => 'three', 'type' => 'recipe.save', 'payload' => [...$this->recipe(), 'category' => 'pleasure', 'categorySource' => 'user']]);
        $recipe = array_find($state['recipes'], fn ($r) => $r['id'] === 'recipe');
        self::assertSame('pleasure', $recipe['category']);
        self::assertSame('user', $recipe['categorySource']);
        $state = $service->execute(1, 7, ['id' => 'four', 'type' => 'recipe.save', 'payload' => [...$this->recipe(), 'category' => null]]);
        self::assertNull(array_find($state['recipes'], fn ($r) => $r['id'] === 'recipe')['category']);
    }

    public function testPantryChangesPreservePreferencesAndOtherCouple(): void
    {
        $service = $this->service();
        $service->execute(1, 7, ['id' => 'profile', 'type' => 'profile.save', 'payload' => [...FoodProfile::defaults(), 'habits' => 'Un joker le jeudi.']]);
        $item = ['id' => 'carrot', 'name' => 'Carotte', 'quantity' => 500, 'unit' => 'g', 'aisle' => 'produce', 'expiresOn' => null, 'reference' => ['source' => 'openfoodfacts', 'type' => 'ingredient', 'id' => 'en:carrot']];
        $service->execute(1, 7, ['id' => 'add', 'type' => 'pantry.save', 'payload' => $item]);
        $state = $service->execute(1, 8, ['id' => 'update', 'type' => 'pantry.save', 'payload' => [...$item, 'quantity' => 200]]);
        self::assertCount(1, $state['foodProfile']['pantry']);
        self::assertEquals(200, $state['foodProfile']['pantry'][0]['quantity']);
        self::assertSame('en:carrot', $state['foodProfile']['pantry'][0]['reference']['id']);
        self::assertSame('Un joker le jeudi.', $state['foodProfile']['habits']);
        self::assertSame([], $service->read(2)['foodProfile']['pantry']);
        $state = $service->execute(1, 7, ['id' => 'remove', 'type' => 'pantry.remove', 'payload' => ['id' => 'carrot']]);
        self::assertSame([], $state['foodProfile']['pantry']);
    }

    public function testLegacyStockGetsStableDistinctIds(): void
    {
        $item = ['name' => 'Carottes', 'quantity' => 2, 'unit' => 'piece', 'aisle' => 'produce'];
        $first = FoodProfile::normalize(['pantry' => [$item, $item]]);
        $second = FoodProfile::normalize($first);
        self::assertSame(array_column($first['pantry'], 'id'), array_column($second['pantry'], 'id'));
        self::assertNotSame($first['pantry'][0]['id'], $first['pantry'][1]['id']);
    }
    public function testCoupleCanClassifyAnAppRecipeWithoutEditingItsContent(): void
    {
        $service = $this->service();
        $original = $service->read(1)['recipes'][0];
        $state = $service->execute(1, 7, ['id' => 'classify-app', 'type' => 'recipe.category', 'payload' => ['id' => $original['id'], 'category' => 'pleasure']]);
        $recipe = array_find($state['recipes'], fn ($r) => $r['id'] === $original['id']);
        self::assertSame('pleasure', $recipe['category']);
        self::assertSame($original['ingredients'], $recipe['ingredients']);
        self::assertNull($service->read(2)['recipes'][0]['category'] ?? null);
    }

}
