<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\HouseholdService;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\DriverManager;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

class HouseholdServiceTest extends TestCase
{
    private Connection $connection;
    private HouseholdService $service;

    protected function setUp(): void
    {
        $this->connection = DriverManager::getConnection(['driver' => 'pdo_sqlite', 'memory' => true]);
        $this->connection->executeStatement('CREATE TABLE couple (id INTEGER PRIMARY KEY, household_data TEXT, household_revision INTEGER DEFAULT 0 NOT NULL)');
        $this->connection->executeStatement('INSERT INTO couple (id) VALUES (1), (2)');
        $this->service = new HouseholdService($this->connection);
    }

    private function runCommand(string $type, array $payload, string $id = ''): array
    {
        return $this->service->execute(1, 7, ['id' => $id ?: bin2hex(random_bytes(8)), 'type' => $type, 'payload' => $payload]);
    }

    private function recipe(string $id, array $ingredients): array
    {
        return ['id' => $id, 'title' => 'Recette test', 'servings' => 2, 'minutes' => 20, 'instructions' => 'Mélanger et cuire.', 'ingredients' => $ingredients];
    }

    public function testPersonalTasksStayPrivatePersistAndSurviveSharedCommands(): void
    {
        $this->runCommand('task.add', ['id' => 'private-one', 'title' => 'Secret rendez-vous']);
        $this->runCommand('task.add', ['id' => 'private-one', 'title' => 'Retry']);
        $this->service->execute(1, 8, ['id' => 'partner-add', 'type' => 'task.add', 'payload' => ['id' => 'partner-one', 'title' => 'Autre tâche']]);
        $state = $this->runCommand('shopping.add', ['id' => 'bread', 'name' => 'Pain', 'quantity' => 1, 'unit' => 'piece', 'aisle' => 'pantry']);
        self::assertCount(2, $state['personalTasks']);
        $own = \App\Service\PersonalTasks::visible($this->service->read(1)['personalTasks'], 7);
        self::assertCount(1, $own);
        self::assertSame('Secret rendez-vous', $own[0]['title']);
        self::assertArrayNotHasKey('ownerId', $own[0]);
        self::assertSame([], $this->service->read(2)['personalTasks'] ?? []);
        $shared = HouseholdService::publicState($state);
        self::assertArrayNotHasKey('personalTasks', $shared);
        self::assertArrayNotHasKey('appliedCommands', $shared);
        $context = (new \App\Service\MealAssistant\MealContextBuilder())->build($state, ['instructions' => '', 'slots' => [['date' => '2026-11-05', 'slot' => 'dinner']]], '2026-11-04');
        self::assertStringNotContainsString('Secret rendez-vous', json_encode($context));
    }

    public function testCoupleTasksAreVisibleEditableAndRestorableByBothMembers(): void
    {
        $state = $this->runCommand('task.add', ['id' => 'shared', 'title' => 'Préparer le week-end', 'scope' => 'couple']);
        foreach ([7, 8] as $member) {
            $visible = \App\Service\PersonalTasks::visible($state['personalTasks'], $member);
            self::assertSame('couple', $visible[0]['scope']);
            self::assertArrayNotHasKey('ownerId', $visible[0]);
        }
        $state = $this->service->execute(1, 8, ['id' => 'partner-complete', 'type' => 'task.set', 'payload' => ['id' => 'shared', 'completed' => true, 'title' => 'Week-end réservé']]);
        self::assertTrue($state['personalTasks'][0]['completed']);
        self::assertSame('Week-end réservé', $state['personalTasks'][0]['title']);
        $this->service->execute(1, 8, ['id' => 'partner-remove', 'type' => 'task.archive', 'payload' => ['id' => 'shared', 'archived' => true]]);
        $state = $this->runCommand('task.archive', ['id' => 'shared', 'archived' => false]);
        self::assertFalse($state['personalTasks'][0]['archived']);
        self::assertSame([], $this->service->read(2)['personalTasks'] ?? []);
        self::assertArrayNotHasKey('personalTasks', HouseholdService::publicState($state));
    }

    public function testLegacyTasksRemainPrivateAndCannotBeSharedImplicitly(): void
    {
        $legacy = [['id' => 'old', 'title' => 'Privé', 'ownerId' => 7, 'completed' => false, 'archived' => false]];
        self::assertSame('personal', \App\Service\PersonalTasks::visible($legacy, 7)[0]['scope']);
        self::assertSame([], \App\Service\PersonalTasks::visible($legacy, 8));
        $state = $this->runCommand('task.add', ['id' => 'personal', 'title' => 'Privé']);
        $state = $this->runCommand('task.set', ['id' => 'personal', 'title' => 'Toujours privé', 'scope' => 'couple']);
        self::assertSame([], \App\Service\PersonalTasks::visible($state['personalTasks'], 8));
        self::assertSame('personal', $state['personalTasks'][0]['scope']);
    }

    public function testInvalidTaskScopeIsRejected(): void
    {
        $this->expectException(BadRequestHttpException::class);
        $this->runCommand('task.add', ['id' => 'invalid', 'title' => 'Test', 'scope' => 'public']);
    }

    public function testTaskCompletionRenameAndReversibleRemoval(): void
    {
        $this->runCommand('task.add', ['id' => 'one', 'title' => ' Appeler ']);
        $this->runCommand('task.set', ['id' => 'one', 'title' => 'Appeler demain', 'completed' => true]);
        $this->runCommand('task.archive', ['id' => 'one', 'archived' => true]);
        $state = $this->runCommand('task.archive', ['id' => 'one', 'archived' => false]);
        self::assertSame('Appeler demain', $state['personalTasks'][0]['title']);
        self::assertTrue($state['personalTasks'][0]['completed']);
        self::assertFalse($state['personalTasks'][0]['archived']);
    }

    public function testPartnerCannotChangeAnyPersonalTaskField(): void
    {
        $before = $this->runCommand('task.add', ['id' => 'one', 'title' => 'Privé']);
        foreach (['task.set' => ['completed' => true], 'task.archive' => ['archived' => true], 'task.add' => ['title' => 'Overwrite']] as $type => $payload) {
            try {
                $this->service->execute(1, 8, ['id' => uniqid(), 'type' => $type, 'payload' => ['id' => 'one', ...$payload]]);
                self::fail('Partner write accepted');
            } catch (\Symfony\Component\HttpKernel\Exception\NotFoundHttpException) {
                self::assertSame($before, $this->service->read(1));
            }
        }
    }

    public function testInvalidTaskChangesDoNotPersist(): void
    {
        $before = $this->runCommand('task.add', ['id' => 'one', 'title' => 'Privé']);
        foreach ([['title' => ' '], ['title' => str_repeat('é', 201)], ['completed' => 'false'], []] as $payload) {
            try {
                $this->runCommand('task.set', ['id' => 'one', ...$payload]);
                self::fail('Invalid write accepted');
            } catch (BadRequestHttpException) {
                self::assertSame($before, $this->service->read(1));
            }
        }
    }

    public function testRecipeAllowsOmittedPreparationAndOptionalPrice(): void
    {
        $payload = $this->recipe('no-steps', [['name' => 'Tomates', 'quantity' => 340, 'unit' => 'g', 'aisle' => 'produce']]);
        unset($payload['instructions']);
        $payload['estimatedCostCents'] = 680;
        $state = $this->runCommand('recipe.save', $payload);
        $saved = array_find($state['recipes'], fn ($recipe) => $recipe['id'] === 'no-steps');
        self::assertSame('', $saved['instructions']);
        self::assertSame(680, $saved['estimatedCostCents']);
        self::assertEquals(340, $saved['ingredients'][0]['quantity']);
        $payload['instructions'] = '   ';
        $payload['estimatedCostCents'] = null;
        $state = $this->runCommand('recipe.save', $payload);
        $saved = array_find($state['recipes'], fn ($recipe) => $recipe['id'] === 'no-steps');
        self::assertSame('', $saved['instructions']);
        self::assertNull($saved['estimatedCostCents']);
    }

    public function testRecipeRejectsInvalidPrice(): void
    {
        $payload = $this->recipe('bad-price', [['name' => 'Tomates', 'quantity' => 340, 'unit' => 'g', 'aisle' => 'produce']]);
        $payload['estimatedCostCents'] = -1;
        $this->expectException(BadRequestHttpException::class);
        $this->runCommand('recipe.save', $payload);
    }

    public function testCommandsAreScopedToTheCoupleAndReplaySafe(): void
    {
        $payload = ['id' => 'manual', 'name' => 'Pain', 'quantity' => 1, 'unit' => 'piece', 'aisle' => 'pantry'];
        $first = $this->runCommand('shopping.add', $payload, 'same-command');
        $replay = $this->runCommand('shopping.add', $payload, 'same-command');
        self::assertEquals($first, $replay);
        self::assertCount(1, $first['shopping']);
        self::assertSame(1, $replay['revision']);
        self::assertSame([], $this->service->read(2)['shopping']);
    }

    public function testGenerationScalesPortionsCombinesUnitsAndKeepsManualItems(): void
    {
        $this->runCommand('recipe.save', $this->recipe('one', [
            ['name' => 'Tomates', 'quantity' => 0.5, 'unit' => 'kg', 'aisle' => 'produce'],
            ['name' => 'Lait', 'quantity' => 0.25, 'unit' => 'l', 'aisle' => 'dairy'],
        ]));
        $this->runCommand('recipe.save', $this->recipe('two', [
            ['name' => ' tomates ', 'quantity' => 250, 'unit' => 'g', 'aisle' => 'produce'],
            ['name' => 'Lait', 'quantity' => 100, 'unit' => 'ml', 'aisle' => 'dairy'],
        ]));
        $this->runCommand('meal.set', ['date' => '2026-11-02', 'slot' => 'lunch', 'recipeId' => 'one', 'servings' => 4]);
        $this->runCommand('meal.set', ['date' => '2026-11-03', 'slot' => 'dinner', 'recipeId' => 'two', 'servings' => 2]);
        $this->runCommand('shopping.add', ['id' => 'manual', 'name' => 'Savon', 'quantity' => 1, 'unit' => 'piece', 'aisle' => 'other']);
        $state = $this->runCommand('shopping.generate', ['week' => '2026-11-02']);
        self::assertCount(3, $state['shopping']);
        $tomatoes = array_find($state['shopping'], fn ($i) => $i['unit'] === 'g');
        $milk = array_find($state['shopping'], fn ($i) => $i['unit'] === 'ml');
        self::assertEquals(1250, $tomatoes['quantity']);
        self::assertEquals(600, $milk['quantity']);
        $this->runCommand('shopping.check', ['id' => $tomatoes['id'], 'checked' => true]);
        $state = $this->runCommand('shopping.generate', ['week' => '2026-11-02']);
        self::assertCount(3, $state['shopping']);
        self::assertTrue(array_find($state['shopping'], fn ($i) => $i['id'] === $tomatoes['id'])['checked']);
        $this->runCommand('meal.set', ['date' => '2026-11-02', 'slot' => 'lunch', 'recipeId' => 'one', 'servings' => 6]);
        $state = $this->runCommand('shopping.generate', ['week' => '2026-11-02']);
        self::assertFalse(array_find($state['shopping'], fn ($i) => $i['id'] === $tomatoes['id'])['checked']);
    }

    public function testMixedUnitsAreGroupedByWeekAndRemovedMealsDisappear(): void
    {
        $this->runCommand('recipe.save', $this->recipe('one', [
            ['name' => 'Tomates', 'quantity' => 1, 'unit' => 'piece', 'aisle' => 'produce'],
            ['name' => 'Tomates', 'quantity' => 100, 'unit' => 'g', 'aisle' => 'produce'],
        ]));
        foreach (['2026-11-02', '2026-11-09'] as $date) {
            $this->runCommand('meal.set', ['date' => $date, 'slot' => 'dinner', 'recipeId' => 'one', 'servings' => 2]);
            $this->runCommand('shopping.generate', ['week' => $date]);
        }
        self::assertCount(2, $this->service->read(1)['shopping']);
        self::assertEquals([['unit' => 'piece', 'quantity' => 1], ['unit' => 'g', 'quantity' => 100]], $this->service->read(1)['shopping'][0]['quantities']);
        $this->runCommand('meal.set', ['date' => '2026-11-02', 'slot' => 'dinner', 'recipeId' => null]);
        $state = $this->runCommand('shopping.generate', ['week' => '2026-11-02']);
        self::assertCount(1, $state['shopping']);
        self::assertSame(['2026-11-09'], array_values(array_unique(array_column($state['shopping'], 'week'))));
    }

    public function testPiecesAndGramsKeepExactNeedsAndNonFoodAdditions(): void
    {
        $this->runCommand('recipe.save', $this->recipe('pieces', [['name' => 'Tomate', 'quantity' => 3, 'unit' => 'piece', 'aisle' => 'produce']]));
        $this->runCommand('recipe.save', $this->recipe('grams', [['name' => 'Tomates', 'quantity' => 350, 'unit' => 'g', 'aisle' => 'produce']]));
        $this->runCommand('recipe.save', $this->recipe('sauce', [['name' => 'Coulis de tomates', 'quantity' => 200, 'unit' => 'ml', 'aisle' => 'pantry']]));
        foreach (['pieces','grams','sauce'] as $index => $recipe) $this->runCommand('meal.set', ['date' => '2026-11-0'.($index + 2), 'slot' => 'dinner', 'recipeId' => $recipe, 'servings' => 2]);
        foreach ([['litter','Litière du chat','pets'],['soap','Savon','household']] as [$id,$name,$aisle]) $this->runCommand('shopping.add', ['id'=>$id,'name'=>$name,'quantity'=>1,'unit'=>'piece','aisle'=>$aisle]);
        $state = $this->runCommand('shopping.generate', ['week'=>'2026-11-02']);
        self::assertCount(4, $state['shopping']);
        $tomato = array_find($state['shopping'], fn ($item) => $item['name'] === 'Tomate');
        self::assertSame([['unit'=>'piece','quantity'=>3.0],['unit'=>'g','quantity'=>350.0]], $tomato['quantities']);
        $this->runCommand('shopping.check', ['id'=>$tomato['id'],'checked'=>true]);
        $this->runCommand('meal.set', ['date'=>'2026-11-03','slot'=>'dinner','recipeId'=>'grams','servings'=>4]);
        $state = $this->runCommand('shopping.generate', ['week'=>'2026-11-02']);
        $tomato = array_find($state['shopping'], fn ($item) => $item['name'] === 'Tomate');
        self::assertFalse($tomato['checked']);
        self::assertEquals(700, $tomato['quantities'][1]['quantity']);
        self::assertSame('pets', array_find($state['shopping'], fn ($item) => $item['id'] === 'litter')['aisle']);
        self::assertSame('household', array_find($state['shopping'], fn ($item) => $item['id'] === 'soap')['aisle']);
    }

    public function testDistinctProductReferencesAreNotMerged(): void
    {
        $ingredients = [];
        foreach (['brand-a','brand-b'] as $id) $ingredients[] = ['name'=>'Lait','quantity'=>1,'unit'=>'l','aisle'=>'dairy','reference'=>['source'=>'openfoodfacts','type'=>'product','id'=>$id]];
        $this->runCommand('recipe.save', $this->recipe('brands', $ingredients));
        $this->runCommand('meal.set', ['date'=>'2026-11-02','slot'=>'dinner','recipeId'=>'brands','servings'=>2]);
        $state = $this->runCommand('shopping.generate', ['week'=>'2026-11-02']);
        self::assertCount(2, $state['shopping']);
        self::assertEquals(1000, $state['shopping'][0]['quantity']);
    }

    public function testNonFoodAislesAreReservedForShopping(): void
    {
        $this->expectException(BadRequestHttpException::class);
        $this->runCommand('recipe.save', $this->recipe('not-food', [['name'=>'Savon','quantity'=>1,'unit'=>'piece','aisle'=>'household']]));
    }

    public function testBothMembersCanEditCustomRecipesWithoutChangingTheirIdentity(): void
    {
        $payload = $this->recipe('mine', [['name' => 'Riz', 'quantity' => 100, 'unit' => 'g', 'aisle' => 'pantry']]);
        $this->runCommand('recipe.save', $payload);
        $this->runCommand('meal.set', ['date' => '2026-11-06', 'slot' => 'dinner', 'recipeId' => 'mine', 'servings' => 2]);
        $payload['title'] = 'Riz modifié par mon partenaire';
        $payload['category'] = 'everyday';
        $payload['ingredients'][0]['quantity'] = 350;
        $payload['instructions'] = '';
        $state = $this->service->execute(1, 8, ['id' => 'partner-edit', 'type' => 'recipe.save', 'payload' => $payload]);
        $matches = array_values(array_filter($state['recipes'], fn ($recipe) => $recipe['id'] === 'mine'));
        self::assertCount(1, $matches);
        self::assertSame(7, $matches[0]['authorId']);
        self::assertSame($payload['title'], $matches[0]['title']);
        self::assertEquals(350, $matches[0]['ingredients'][0]['quantity']);
        self::assertSame('', $matches[0]['instructions']);
        self::assertSame('mine', $state['meals']['2026-11-06-dinner']['recipeId']);
        self::assertSame('everyday', $state['meals']['2026-11-06-dinner']['category']);
        self::assertFalse(array_any($this->service->read(2)['recipes'], fn ($recipe) => $recipe['id'] === 'mine'));
    }

    public function testAppRecipeCannotBeOverwritten(): void
    {
        $before = $this->service->read(1);
        try {
            $this->runCommand('recipe.save', $this->recipe('app-pasta', [['name' => 'Riz', 'quantity' => 100, 'unit' => 'g', 'aisle' => 'pantry']]));
            self::fail('Catalog recipe overwritten');
        } catch (BadRequestHttpException) {
            self::assertSame($before, $this->service->read(1));
        }
    }

    public function testCustomPlanningStartPersistsAndShoppingUsesExactlySevenChosenDays(): void
    {
        $this->runCommand('recipe.save', $this->recipe('rice', [['name' => 'Riz', 'quantity' => 100, 'unit' => 'g', 'aisle' => 'pantry']]));
        foreach (['2026-11-05', '2026-11-06', '2026-11-09', '2026-11-12', '2026-11-13'] as $date) {
            $this->runCommand('meal.set', ['date' => $date, 'slot' => 'dinner', 'recipeId' => 'rice', 'servings' => 2]);
        }
        $before = $this->service->read(1)['meals'];
        $this->runCommand('planning.start', ['date' => '2026-11-06']);
        $state = $this->runCommand('shopping.generate', ['week' => '2026-11-06']);
        self::assertSame('2026-11-06', $this->service->read(1)['planningStart']);
        self::assertSame($before, $state['meals']);
        self::assertCount(1, $state['shopping']);
        self::assertEquals(300, $state['shopping'][0]['quantity']);
        self::assertSame('2026-11-06', $state['shopping'][0]['week']);
        self::assertArrayNotHasKey('planningStart', $this->service->read(2));
    }

    public function testImpossiblePlanningStartIsRejectedWithoutChangingState(): void
    {
        $before = $this->service->read(1);
        try {
            $this->runCommand('planning.start', ['date' => '2026-02-31']);
            self::fail('Invalid date accepted');
        } catch (BadRequestHttpException) {
            self::assertSame($before, $this->service->read(1));
        }
    }

    public function testTwoDishesUseTheirOwnPortionsAndCombineShoppingQuantities(): void
    {
        $this->runCommand('recipe.save', $this->recipe('main', [
            ['name' => 'Riz', 'quantity' => 100, 'unit' => 'g', 'aisle' => 'pantry'],
            ['name' => 'Tomates', 'quantity' => 3, 'unit' => 'piece', 'aisle' => 'produce'],
        ]));
        $this->runCommand('recipe.save', $this->recipe('starter', [
            ['name' => 'Riz', 'quantity' => 50, 'unit' => 'g', 'aisle' => 'pantry'],
            ['name' => 'Tomates', 'quantity' => 350, 'unit' => 'g', 'aisle' => 'produce'],
        ]));
        $state = $this->runCommand('meal.set', ['date' => '2026-11-06', 'slot' => 'dinner', 'recipeId' => 'main', 'servings' => 4, 'extra' => ['recipeId' => 'starter', 'servings' => 1]]);
        self::assertCount(1, $state['meals']);
        self::assertSame('starter', $state['meals']['2026-11-06-dinner']['extra']['recipeId']);
        self::assertSame([], $this->service->read(2)['meals']);
        $state = $this->runCommand('shopping.generate', ['week' => '2026-11-06']);
        self::assertCount(2, $state['shopping']);
        $rice = array_find($state['shopping'], fn ($item) => $item['name'] === 'Riz');
        $tomatoes = array_find($state['shopping'], fn ($item) => $item['name'] === 'Tomates');
        self::assertEquals(225, $rice['quantity']);
        self::assertEquals(['piece' => 6, 'g' => 175], array_column($tomatoes['quantities'], 'quantity', 'unit'));
        self::assertCount(2, $this->runCommand('shopping.generate', ['week' => '2026-11-06'])['shopping']);
        $this->runCommand('shopping.check', ['id' => $rice['id'], 'checked' => true]);
        $this->runCommand('meal.set', ['date' => '2026-11-06', 'slot' => 'dinner', 'recipeId' => 'main', 'servings' => 4, 'extra' => ['recipeId' => 'starter', 'servings' => 4]]);
        $state = $this->runCommand('shopping.generate', ['week' => '2026-11-06']);
        self::assertFalse(array_find($state['shopping'], fn ($item) => $item['name'] === 'Riz')['checked']);
    }

    public function testLegacyMealEditsKeepExtraAndExplicitRemovalOnlyRemovesExtra(): void
    {
        $payload = ['date' => '2026-11-06', 'slot' => 'dinner', 'recipeId' => 'app-pasta', 'servings' => 2];
        $this->runCommand('meal.set', [...$payload, 'extra' => ['recipeId' => 'app-curry', 'servings' => 3]]);
        $state = $this->runCommand('meal.set', [...$payload, 'servings' => 4]);
        self::assertSame('app-curry', $state['meals']['2026-11-06-dinner']['extra']['recipeId']);
        self::assertEquals(3, $state['meals']['2026-11-06-dinner']['extra']['servings']);
        $state = $this->runCommand('meal.set', [...$payload, 'extra' => null]);
        self::assertSame('app-pasta', $state['meals']['2026-11-06-dinner']['recipeId']);
        self::assertArrayNotHasKey('extra', $state['meals']['2026-11-06-dinner']);
        $state = $this->runCommand('meal.set', [...$payload, 'recipeId' => null]);
        self::assertSame([], $state['meals']);
    }

    public function testInvalidOrDuplicateSecondDishCannotModifyTheMeal(): void
    {
        $payload = ['date' => '2026-11-06', 'slot' => 'dinner', 'recipeId' => 'app-pasta', 'servings' => 2];
        $this->runCommand('meal.set', $payload);
        $before = $this->service->read(1);
        foreach (['invalid', [], ['recipeId' => 'missing', 'servings' => 2], ['recipeId' => 'app-pasta', 'servings' => 2], ['recipeId' => 'app-curry', 'servings' => 0], ['recipeId' => 'app-curry', 'servings' => 21]] as $extra) {
            try {
                $this->runCommand('meal.set', [...$payload, 'extra' => $extra]);
                self::fail('Invalid second dish accepted');
            } catch (BadRequestHttpException) {
                self::assertSame($before, $this->service->read(1));
            }
        }
    }

    public function testInvalidDateDoesNotWriteState(): void
    {
        try {
            $this->runCommand('meal.set', ['date' => '2026-02-31', 'slot' => 'lunch', 'recipeId' => 'app-pasta', 'servings' => 2]);
            self::fail('Invalid date accepted');
        } catch (BadRequestHttpException) {
            self::assertSame(0, $this->service->read(1)['revision']);
        }
    }

    public function testInvalidIngredientQuantityIsRejected(): void
    {
        $this->expectException(BadRequestHttpException::class);
        $this->runCommand('shopping.add', ['id' => 'bad', 'name' => 'Riz', 'quantity' => -2, 'unit' => 'g', 'aisle' => 'pantry']);
    }

    public function testTwoMembersCanUpdateDifferentItemsWithoutLosingChanges(): void
    {
        foreach (['bread', 'milk'] as $id) $this->runCommand('shopping.add', ['id' => $id, 'name' => $id, 'quantity' => 1, 'unit' => 'piece', 'aisle' => 'pantry']);
        $this->runCommand('shopping.check', ['id' => 'bread', 'checked' => true]);
        $state = $this->service->execute(1, 8, ['id' => 'partner-check', 'type' => 'shopping.check', 'payload' => ['id' => 'milk', 'checked' => true]]);
        self::assertSame([true, true], array_column($state['shopping'], 'checked'));
    }
    public function testConcurrentWriteIsRetriedAgainstLatestState(): void
    {
        $initial = HouseholdService::emptyState();
        $partnerState = $initial;
        $partnerState['shopping'][] = ['id' => 'partner-item', 'name' => 'Pain', 'quantity' => 1, 'unit' => 'piece', 'aisle' => 'pantry', 'checked' => true, 'week' => null];
        $connection = $this->createMock(Connection::class);
        $connection->expects($this->exactly(2))->method('fetchAssociative')->willReturnOnConsecutiveCalls(
            ['household_data' => json_encode($initial), 'household_revision' => 0],
            ['household_data' => json_encode($partnerState), 'household_revision' => 1]
        );
        $connection->expects($this->exactly(2))->method('executeStatement')->willReturnOnConsecutiveCalls(0, 1);
        $service = new HouseholdService($connection);
        $state = $service->execute(1, 7, ['id' => 'my-command', 'type' => 'shopping.add', 'payload' => ['id' => 'my-item', 'name' => 'Pommes', 'quantity' => 2, 'unit' => 'piece', 'aisle' => 'produce']]);
        self::assertSame(['partner-item', 'my-item'], array_column($state['shopping'], 'id'));
        self::assertTrue($state['shopping'][0]['checked']);
        self::assertSame(2, $state['revision']);
    }

}
