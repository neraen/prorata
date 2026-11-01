<?php

declare(strict_types=1);

namespace App\Tests\Service\MealAssistant;

use App\Service\HouseholdService;
use App\Service\MealAssistant\FoodProfile;
use App\Service\MealAssistant\MealAssistantService;
use App\Service\MealAssistant\MealContextBuilder;
use App\Service\MealAssistant\MealOpenAiClient;
use App\Service\MealAssistant\MealProposalValidator;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\DriverManager;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Symfony\Component\Uid\Uuid;

class MealAssistantServiceTest extends TestCase
{
    private Connection $db;
    private HouseholdService $household;
    private array $request;
    private array $proposal;

    protected function setUp(): void
    {
        $this->db = DriverManager::getConnection(['driver' => 'pdo_sqlite', 'memory' => true]);
        $this->db->executeStatement('CREATE TABLE couple (id INTEGER PRIMARY KEY, household_data TEXT, household_revision INTEGER DEFAULT 0 NOT NULL)');
        $this->db->executeStatement('CREATE TABLE meal_assistant_run (id VARCHAR(36) PRIMARY KEY, couple_id INTEGER, created_by_user_id INTEGER, purpose TEXT DEFAULT \'plan\', status TEXT, model TEXT, request_hash TEXT, context_hash TEXT, result TEXT, token_usage TEXT, created_at TEXT, accepted_at TEXT)');
        $this->db->executeStatement('INSERT INTO couple (id) VALUES (1),(2)');
        $this->household = new HouseholdService($this->db);
        $this->household->execute(1, 7, ['id' => 'profile', 'type' => 'profile.save', 'payload' => [...FoodProfile::defaults(), 'equipment' => ['Four']]]);
        $this->request = MealProposalValidatorTest::requestData();
        $this->request['id'] = Uuid::v4()->toRfc4122();
        $tomorrow = (new \DateTimeImmutable('tomorrow', new \DateTimeZone('Europe/Paris')))->format('Y-m-d');
        $this->request['slots'][0]['date'] = $tomorrow;
        $this->proposal = MealProposalValidatorTest::proposalData();
        $this->proposal['meals'][0]['date'] = $tomorrow;
    }

    private function service(int $calls = 1, int $limit = 20): MealAssistantService
    {
        $client = $this->createMock(MealOpenAiClient::class);
        $client->method('enabled')->willReturn(true);
        $client->method('model')->willReturn('gpt-4.1');
        $client->expects($this->exactly($calls))->method('generate')->willReturnCallback(function ($context) {
            self::assertSame([], $context['profile']['allergies']);
            return ['proposal' => $this->proposal, 'model' => 'gpt-4.1', 'usage' => ['inputTokens' => 100, 'outputTokens' => 100, 'cachedInputTokens' => 0]];
        });
        return new MealAssistantService($this->db, $this->household, new MealContextBuilder(), new MealProposalValidator(), $client, $limit);
    }

    public function testGenerationIsOnlyADraftAndReplayDoesNotSpendAgain(): void
    {
        $service = $this->service();
        $draft = $service->generate(1, 7, $this->request);
        self::assertSame([], $this->household->read(1)['meals']);
        self::assertSame($draft['id'], $service->generate(1, 7, $this->request)['id']);
        self::assertSame(19, $service->status(1)['remaining']);
        self::assertSame(20, $service->status(2)['remaining']);
        self::assertNull($service->status(2)['draft']);
    }

    public function testApprovalCreatesRecipesAndPlanOnce(): void
    {
        $service = $this->service();
        $draft = $service->generate(1, 7, $this->request);
        $approved = $service->accept(1, 8, $draft['id']);
        self::assertCount(1, $approved['meals']);
        $recipe = array_find($approved['recipes'], fn ($r) => ($r['origin'] ?? null) === 'ai');
        self::assertNotNull($recipe);
        self::assertSame('joker', $recipe['category']);
        self::assertSame(8, $recipe['authorId']);
        self::assertSame($approved['revision'], $service->accept(1, 8, $draft['id'])['revision']);
        self::assertNull($service->status(1)['draft']);
    }

    public function testAnotherCoupleCannotApproveDraft(): void
    {
        $service = $this->service();
        $draft = $service->generate(1, 7, $this->request);
        $this->expectException(NotFoundHttpException::class);
        $service->accept(2, 9, $draft['id']);
    }

    public function testChangedFoodProfileInvalidatesApproval(): void
    {
        $service = $this->service();
        $draft = $service->generate(1, 7, $this->request);
        $this->household->execute(1, 7, ['id' => 'change-profile', 'type' => 'profile.save', 'payload' => [...FoodProfile::defaults(), 'allergies' => ['lait']]]);
        $this->expectException(ConflictHttpException::class);
        $service->accept(1, 7, $draft['id']);
    }

    public function testPartnerMealIsNotOverwrittenAndApprovalIsAtomic(): void
    {
        $service = $this->service();
        $draft = $service->generate(1, 7, $this->request);
        $slot = $this->request['slots'][0];
        $this->household->execute(1, 8, ['id' => 'partner-plan', 'type' => 'meal.set', 'payload' => [...$slot, 'recipeId' => 'app-pasta', 'servings' => 2]]);
        try { $service->accept(1, 7, $draft['id']); self::fail('Collision accepted'); }
        catch (ConflictHttpException) {
            $state = $this->household->read(1);
            self::assertCount(3, $state['recipes']);
            self::assertSame('app-pasta', $state['meals'][$slot['date'].'-'.$slot['slot']]['recipeId']);
        }
    }

    public function testDailyQuotaStopsBeforeAnotherProviderCall(): void
    {
        $service = $this->service(limit: 1);
        $service->generate(1, 7, $this->request);
        $this->request['id'] = Uuid::v4()->toRfc4122();
        $this->expectException(TooManyRequestsHttpException::class);
        $service->generate(1, 7, $this->request);
    }

    public function testUntrustedClientCannotImportItsOwnAiPlan(): void
    {
        $this->expectException(BadRequestHttpException::class);
        $this->household->execute(1, 7, ['id' => 'fake', 'type' => 'assistant.accept', 'payload' => ['meals' => $this->proposal['meals'], 'runId' => 'fake']]);
    }
}
