<?php

declare(strict_types=1);

namespace App\Tests\Service\MealAssistant;

use App\Service\HouseholdService;
use App\Service\MealAssistant\MealAssistantService;
use App\Service\MealAssistant\MealContextBuilder;
use App\Service\MealAssistant\MealOpenAiClient;
use App\Service\MealAssistant\MealProposalValidator;
use App\Service\MealAssistant\RecipeClassificationService;
use Doctrine\DBAL\DriverManager;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Uid\Uuid;

class RecipeClassificationServiceTest extends TestCase
{
    private function services(string $confidence = 'high'): array
    {
        $db = DriverManager::getConnection(['driver' => 'pdo_sqlite', 'memory' => true]);
        $db->executeStatement('CREATE TABLE couple (id INTEGER PRIMARY KEY, household_data TEXT, household_revision INTEGER DEFAULT 0 NOT NULL)');
        $db->executeStatement("CREATE TABLE meal_assistant_run (id TEXT PRIMARY KEY, couple_id INTEGER, created_by_user_id INTEGER, purpose TEXT DEFAULT 'plan', status TEXT, model TEXT, request_hash TEXT, context_hash TEXT, result TEXT, token_usage TEXT, created_at TEXT, accepted_at TEXT)");
        $db->executeStatement('INSERT INTO couple (id) VALUES (1),(2)');
        $ai = $this->createMock(MealOpenAiClient::class);
        $ai->method('enabled')->willReturn(true);
        $ai->method('model')->willReturn('gpt-4.1');
        $ai->expects($this->once())->method('classify')->willReturn(['proposal' => ['category' => 'joker', 'confidence' => $confidence, 'reason' => 'Produit prêt à réchauffer.'], 'model' => 'gpt-4.1', 'usage' => ['inputTokens' => 20, 'outputTokens' => 20]]);
        $ledger = new MealAssistantService($db, new HouseholdService($db), new MealContextBuilder(), new MealProposalValidator(), $ai, 20);
        return [new RecipeClassificationService($db, $ledger, $ai), $ledger];
    }

    private function request(): array { return ['id' => Uuid::v4()->toRfc4122(), 'recipe' => ['title' => 'Pizza surgelée', 'servings' => 2, 'minutes' => 20, 'instructions' => 'Réchauffer selon le paquet.', 'ingredients' => [['name' => 'Pizza surgelée', 'quantity' => 1, 'unit' => 'piece', 'aisle' => 'frozen']]]]; }

    public function testClassificationIsReplaySafeAndDoesNotBecomeAMealDraft(): void
    {
        [$classifier, $ledger] = $this->services();
        $request = $this->request();
        $result = $classifier->classify(1, 7, $request);
        self::assertSame('joker', $result['category']);
        self::assertSame($result, $classifier->classify(1, 7, $request));
        self::assertNull($ledger->status(1)['draft']);
        self::assertSame(19, $ledger->status(1)['remaining']);
        self::assertSame(20, $ledger->status(2)['remaining']);
    }

    public function testLowConfidenceLeavesTheCategoryOpen(): void
    {
        [$classifier] = $this->services('low');
        self::assertNull($classifier->classify(1, 7, $this->request())['category']);
    }

    public function testAClassificationCannotBeApprovedAsAMealPlan(): void
    {
        [$classifier, $ledger] = $this->services();
        $request = $this->request();
        $classifier->classify(1, 7, $request);
        $this->expectException(NotFoundHttpException::class);
        $ledger->accept(1, 7, $request['id']);
    }
}
