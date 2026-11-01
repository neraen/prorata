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

    public function testDifferentUnitsAndWeeksRemainSeparateAndRemovedMealsDisappear(): void
    {
        $this->runCommand('recipe.save', $this->recipe('one', [
            ['name' => 'Tomates', 'quantity' => 1, 'unit' => 'piece', 'aisle' => 'produce'],
            ['name' => 'Tomates', 'quantity' => 100, 'unit' => 'g', 'aisle' => 'produce'],
        ]));
        foreach (['2026-11-02', '2026-11-09'] as $date) {
            $this->runCommand('meal.set', ['date' => $date, 'slot' => 'dinner', 'recipeId' => 'one', 'servings' => 2]);
            $this->runCommand('shopping.generate', ['week' => $date]);
        }
        self::assertCount(4, $this->service->read(1)['shopping']);
        $this->runCommand('meal.set', ['date' => '2026-11-02', 'slot' => 'dinner', 'recipeId' => null]);
        $state = $this->runCommand('shopping.generate', ['week' => '2026-11-02']);
        self::assertCount(2, $state['shopping']);
        self::assertSame(['2026-11-09'], array_values(array_unique(array_column($state['shopping'], 'week'))));
    }

    public function testOnlyAuthorCanEditRecipe(): void
    {
        $payload = $this->recipe('mine', [['name' => 'Riz', 'quantity' => 100, 'unit' => 'g', 'aisle' => 'pantry']]);
        $this->runCommand('recipe.save', $payload);
        $this->expectException(BadRequestHttpException::class);
        $this->service->execute(1, 8, ['id' => 'other-user-edit', 'type' => 'recipe.save', 'payload' => $payload]);
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
