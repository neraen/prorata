<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\Food\FoodSuggestions;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Cache\Adapter\ArrayAdapter;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

class FoodSuggestionsTest extends TestCase
{
    public function testLabelsAreCanonicalizedInOneBatchAndCached(): void
    {
        $calls = 0;
        $client = new MockHttpClient(function ($method, $url) use (&$calls) {
            ++$calls;
            self::assertSame('GET', $method);
            self::assertStringStartsWith('https://world.openfoodfacts.org/api/v3/', $url);
            return new MockResponse(str_contains($url, 'taxonomy_suggestions') ? '{"suggestions":["Carotte","Carotte cuite"]}' : '{"canonical_tags_list":"en:carrot,en:cooked-carrot"}');
        });
        $service = new FoodSuggestions($client, new ArrayAdapter());
        $result = $service->search('carotte');
        self::assertTrue($result['available']);
        self::assertSame('en:carrot', $result['items'][0]['reference']['id']);
        self::assertSame('ingredient', $result['items'][0]['reference']['type']);
        self::assertEquals($result, $service->search('CAROTTE'));
        self::assertSame(2, $calls);
    }

    public function testAProviderOutageDoesNotBlockFreeText(): void
    {
        $service = new FoodSuggestions(new MockHttpClient(new MockResponse('', ['http_code' => 503])), new ArrayAdapter());
        self::assertSame(['items' => [], 'available' => false], $service->search('courgette'));
    }

    public function testNoCanonicalIdIsInventedWhenResolutionFails(): void
    {
        $client = new MockHttpClient([new MockResponse('{"suggestions":["Aliment rare"]}'), new MockResponse('', ['http_code' => 503])]);
        $result = (new FoodSuggestions($client, new ArrayAdapter()))->search('aliment');
        self::assertSame('Aliment rare', $result['items'][0]['name']);
        self::assertNull($result['items'][0]['reference']);
    }

    public function testEmptyQueriesDoNotCallTheProvider(): void
    {
        $calls = 0;
        $service = new FoodSuggestions(new MockHttpClient(function () use (&$calls) { ++$calls; return new MockResponse('{}'); }), new ArrayAdapter());
        self::assertSame([], $service->search('a')['items']);
        self::assertSame(0, $calls);
    }
}
