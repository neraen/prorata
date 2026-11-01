<?php

declare(strict_types=1);

namespace App\Tests\Service\MealAssistant;

use App\Service\MealAssistant\MealOpenAiClient;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;

class MealOpenAiClientTest extends TestCase
{
    private function prompt(): string { return dirname(__DIR__, 3).'/resources/prompts/meal-assistant.fr.md'; }

    public function testUsesStructuredResponsesWithoutProviderStorage(): void
    {
        $http = new MockHttpClient(function ($method, $url, $options) {
            self::assertSame('POST', $method);
            self::assertSame('https://api.openai.com/v1/responses', $url);
            $body = json_decode($options['body'], true);
            self::assertSame('gpt-4.1', $body['model']);
            self::assertFalse($body['store']);
            self::assertTrue($body['text']['format']['strict']);
            self::assertStringContainsString('joker', $body['instructions']);
            self::assertStringContainsString('retrievedRecipes', $body['instructions']);
            return new MockResponse(json_encode(['status' => 'completed', 'model' => 'gpt-4.1', 'output' => [['type' => 'message', 'content' => [['type' => 'output_text', 'text' => '{"meals":[]}']]]], 'usage' => ['input_tokens' => 20, 'output_tokens' => 10]]));
        });
        $result = (new MealOpenAiClient($http, 'sk-test', 'gpt-4.1', $this->prompt()))->generate(['profile' => []], ['instructions' => 'Test']);
        self::assertSame([], $result['proposal']['meals']);
        self::assertSame(20, $result['usage']['inputTokens']);
    }

    public function testPhotoUsesVisionInputAndStructuredOutputWithoutStorage(): void
    {
        $http = new MockHttpClient(function ($method, $url, $options) {
            $body = json_decode($options['body'], true);
            self::assertFalse($body['store']);
            self::assertSame('input_image', $body['input'][0]['content'][1]['type']);
            self::assertSame('data:image/jpeg;base64,dGVzdA==', $body['input'][0]['content'][1]['image_url']);
            self::assertSame('high', $body['input'][0]['content'][1]['detail']);
            self::assertSame('pantry_photo', $body['text']['format']['name']);
            self::assertTrue($body['text']['format']['strict']);
            return new MockResponse(json_encode(['status' => 'completed', 'output' => [['type' => 'message', 'content' => [['type' => 'output_text', 'text' => '{"items":[],"warnings":[]}']]]]]));
        });
        $result = (new MealOpenAiClient($http, 'sk-test', 'gpt-4.1', $this->prompt()))->inspectPantry('data:image/jpeg;base64,dGVzdA==');
        self::assertSame([], $result['proposal']['items']);
    }

    public function testProviderErrorIsSanitized(): void
    {
        $client = new MealOpenAiClient(new MockHttpClient(new MockResponse('{"error":"sensitive-provider-body"}', ['http_code' => 401])), 'sk-test', 'gpt-4.1', $this->prompt());
        try { $client->generate([], []); self::fail('Error not thrown'); }
        catch (ServiceUnavailableHttpException $e) { self::assertStringNotContainsString('sensitive-provider-body', $e->getMessage()); self::assertStringNotContainsString('sk-test', $e->getMessage()); }
    }

    public function testIncompleteResponseDoesNotBecomeADraft(): void
    {
        $this->expectException(ServiceUnavailableHttpException::class);
        (new MealOpenAiClient(new MockHttpClient(new MockResponse('{"status":"incomplete","output":[]}')), 'sk-test', 'gpt-4.1', $this->prompt()))->generate([], []);
    }

    public function testRefusalDoesNotBecomeADraft(): void
    {
        $body = ['status' => 'completed', 'output' => [['type' => 'message', 'content' => [['type' => 'refusal', 'refusal' => 'No']]]]];
        $this->expectException(ServiceUnavailableHttpException::class);
        (new MealOpenAiClient(new MockHttpClient(new MockResponse(json_encode($body))), 'sk-test', 'gpt-4.1', $this->prompt()))->generate([], []);
    }
}
