<?php

declare(strict_types=1);

namespace App\Service\Food;

use App\Service\MealAssistant\FoodProfile;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class FoodSuggestions
{
    private const HOST = 'https://world.openfoodfacts.org';
    private const USER_AGENT = 'Prorata/0.3 (https://prorata.clement-silvestre.fr)';

    public function __construct(private HttpClientInterface $client, private CacheInterface $cache) {}

    public function search(string $query): array
    {
        $query = FoodProfile::text($query, 60);
        if (mb_strlen($query) < 2) return ['items' => [], 'available' => true];
        return $this->cache->get('food-suggestions-'.hash('sha256', FoodProfile::fold($query)), function (ItemInterface $item) use ($query) {
            try {
                $response = $this->client->request('GET', self::HOST.'/api/v3/taxonomy_suggestions', ['query' => ['tagtype' => 'ingredients', 'lc' => 'fr', 'cc' => 'fr', 'string' => $query, 'limit' => 8], 'headers' => ['User-Agent' => self::USER_AGENT], 'timeout' => 6, 'max_duration' => 8]);
                if ($response->getStatusCode() !== 200) throw new \RuntimeException();
                $body = $response->toArray(false);
                $names = array_values(array_filter(array_slice($body['suggestions'] ?? [], 0, 8), fn ($name) => is_string($name) && trim($name) !== '' && mb_strlen($name) <= 100 && !str_contains($name, ',')));
                $ids = [];
                // Suggestions carry labels; resolve them in one batch instead of
                // inventing canonical ingredient IDs from their French names.
                if ($names) {
                    try {
                        $canonical = $this->client->request('GET', self::HOST.'/api/v3/taxonomy_canonicalize_tags', ['query' => ['tagtype' => 'ingredients', 'lc' => 'fr', 'local_tags_list' => implode(',', $names)], 'headers' => ['User-Agent' => self::USER_AGENT], 'timeout' => 5, 'max_duration' => 6]);
                        if ($canonical->getStatusCode() === 200) {
                            $list = $canonical->toArray(false)['canonical_tags_list'] ?? '';
                            if (is_string($list)) $ids = explode(',', $list);
                        }
                    } catch (\Throwable) { /* Labels remain usable without a reference. */ }
                }
                $items = [];
                foreach ($names as $index => $name) {
                    $id = count($ids) === count($names) ? trim($ids[$index]) : '';
                    $items[] = ['name' => $name, 'reference' => preg_match('/^[a-z]{2}:[^\s]+$/u', $id) && mb_strlen($id) <= 200 ? ['source' => 'openfoodfacts', 'type' => 'ingredient', 'id' => $id] : null];
                }
                $item->expiresAfter(604800);
                return ['items' => $items, 'available' => true];
            } catch (\Throwable) {
                $item->expiresAfter(60);
                return ['items' => [], 'available' => false];
            }
        });
    }
}
