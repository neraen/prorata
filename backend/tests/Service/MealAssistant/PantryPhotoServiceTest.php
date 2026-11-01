<?php

declare(strict_types=1);

namespace App\Tests\Service\MealAssistant;

use App\Service\HouseholdService;
use App\Service\MealAssistant\{MealAssistantService, MealContextBuilder, MealOpenAiClient, MealProposalValidator, PantryPhotoService};
use Doctrine\DBAL\DriverManager;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\{BadRequestHttpException, ConflictHttpException, ServiceUnavailableHttpException};
use Symfony\Component\Uid\Uuid;

class PantryPhotoServiceTest extends TestCase
{
    private const IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';

    private function services(?array $items = null): array
    {
        $db = DriverManager::getConnection(['driver' => 'pdo_sqlite', 'memory' => true]);
        $db->executeStatement('CREATE TABLE couple (id INTEGER PRIMARY KEY, household_data TEXT, household_revision INTEGER DEFAULT 0 NOT NULL)');
        $db->executeStatement("CREATE TABLE meal_assistant_run (id TEXT PRIMARY KEY, couple_id INTEGER, created_by_user_id INTEGER, purpose TEXT DEFAULT 'plan', status TEXT, model TEXT, request_hash TEXT, context_hash TEXT, result TEXT, token_usage TEXT, created_at TEXT, accepted_at TEXT)");
        $db->executeStatement('INSERT INTO couple (id) VALUES (1),(2)');
        $ai = $this->createStub(MealOpenAiClient::class);
        $ai->method('enabled')->willReturn(true);
        $ai->method('model')->willReturn('gpt-4.1');
        $ai->method('inspectPantry')->willReturn(['proposal' => ['items' => $items ?? [['name' => 'Carottes', 'quantity' => null, 'unit' => 'piece', 'aisle' => 'produce', 'confidence' => 'medium', 'note' => 'Quantité à renseigner']], 'warnings' => []], 'model' => 'gpt-4.1', 'usage' => ['inputTokens' => 200, 'outputTokens' => 80]]);
        $household = new HouseholdService($db);
        $ledger = new MealAssistantService($db, $household, new MealContextBuilder(), new MealProposalValidator(), $ai, 1);
        return [new PantryPhotoService($db, $ledger, $ai), $ledger, $household, $db];
    }

    public function testPhotoReturnsReviewWithoutChangingStockOrPersistingImageAndReplayUsesNoQuota(): void
    {
        [$photos, $ledger, $household, $db] = $this->services();
        $input = ['id' => Uuid::v4()->toRfc4122(), 'image' => self::IMAGE];
        $result = $photos->inspect(1, 7, $input);
        self::assertNull($result['items'][0]['quantity']);
        self::assertSame($result, $photos->inspect(1, 7, $input));
        self::assertSame([], $household->read(1)['foodProfile']['pantry']);
        self::assertSame(0, $ledger->status(1)['remaining']);
        self::assertNull($ledger->status(1)['draft']);
        self::assertSame(1, $ledger->status(2)['remaining']);
        $row = $db->fetchAssociative('SELECT * FROM meal_assistant_run');
        self::assertSame('pantry-photo', $row['purpose']);
        self::assertStringNotContainsString('base64', json_encode($row));
        self::assertStringNotContainsString('iVBOR', json_encode($row));
        $this->expectException(ConflictHttpException::class);
        $photos->inspect(2, 8, $input);
    }

    public function testMimeSpoofingIsRejectedBeforeQuotaReservation(): void
    {
        [$photos, $ledger] = $this->services();
        try { $photos->inspect(1, 7, ['id' => Uuid::v4()->toRfc4122(), 'image' => str_replace('image/png', 'image/jpeg', self::IMAGE)]); self::fail('Rejected image expected'); }
        catch (BadRequestHttpException) { self::assertSame(1, $ledger->status(1)['remaining']); }
    }

    public function testRemoteUrlsAreNotFetched(): void
    {
        [$photos] = $this->services();
        $this->expectException(BadRequestHttpException::class);
        $photos->inspect(1, 7, ['id' => Uuid::v4()->toRfc4122(), 'image' => 'http://127.0.0.1/private']);
    }

    public function testInvalidProviderQuantityDoesNotBecomeAReadyResult(): void
    {
        [$photos, , , $db] = $this->services([['name' => 'Carottes', 'quantity' => -1, 'unit' => 'piece', 'aisle' => 'produce', 'confidence' => 'high', 'note' => '']]);
        try { $photos->inspect(1, 7, ['id' => Uuid::v4()->toRfc4122(), 'image' => self::IMAGE]); self::fail('Invalid output expected'); }
        catch (ServiceUnavailableHttpException) { self::assertSame('failed', $db->fetchOne('SELECT status FROM meal_assistant_run')); }
    }

    public function testBulkImportIsAtomicAndStableItemIdsPreventRetryDuplicates(): void
    {
        [, , $household] = $this->services();
        $item = ['id' => 'photo-test-0', 'name' => 'Carottes', 'quantity' => 3, 'unit' => 'piece', 'aisle' => 'produce'];
        try { $household->execute(1, 7, ['id' => 'invalid', 'type' => 'pantry.import', 'payload' => ['items' => [$item, [...$item, 'id' => 'bad', 'quantity' => 0]]]]); self::fail('Invalid quantity expected'); }
        catch (BadRequestHttpException) { self::assertSame([], $household->read(1)['foodProfile']['pantry']); }
        $household->execute(1, 7, ['id' => 'first', 'type' => 'pantry.import', 'payload' => ['items' => [$item]]]);
        $state = $household->execute(1, 7, ['id' => 'retry', 'type' => 'pantry.import', 'payload' => ['items' => [$item]]]);
        self::assertCount(1, $state['foodProfile']['pantry']);
        self::assertSame([], $household->read(2)['foodProfile']['pantry']);
    }
}
