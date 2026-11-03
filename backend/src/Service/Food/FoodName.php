<?php

declare(strict_types=1);
namespace App\Service\Food;

/** Conservative aliases only: no fuzzy merge of different products or preparations. */
final class FoodName
{
    public static function shoppingIdentity(array $ingredient): string
    {
        $reference = $ingredient['reference'] ?? null;
        return self::canonical($ingredient['name']).'|'.(($reference['type'] ?? null) === 'product' ? json_encode($reference) : '');
    }

    public static function canonical(string $name): string
    {
        $folded = mb_strtolower(trim($name));
        $folded = strtr($folded, ['é'=>'e','è'=>'e','ê'=>'e','ë'=>'e','à'=>'a','â'=>'a','ä'=>'a','î'=>'i','ï'=>'i','ô'=>'o','ö'=>'o','ù'=>'u','û'=>'u','ü'=>'u','ç'=>'c','œ'=>'oe','’'=>"'"]);
        $folded = preg_replace('/\\s+/u', ' ', $folded);
        $groups = [
            ['tomate','tomates'], ['carotte','carottes'], ['courgette','courgettes'],
            ['pomme de terre','pommes de terre'], ['patate douce','patates douces'],
            ['oignon','oignons'], ['poireau','poireaux'], ['champignon','champignons'],
            ['poivron','poivrons'], ['aubergine','aubergines'], ['concombre','concombres'],
            ['avocat','avocats'], ['citron','citrons'], ['pomme','pommes'], ['banane','bananes'],
            ['poire','poires'], ['orange','oranges'], ['fraise','fraises'], ['oeuf','oeufs'],
            ['brocoli','brocolis'], ['chou-fleur','choux-fleurs'],
        ];
        foreach ($groups as $aliases) if (in_array($folded, $aliases, true)) return $aliases[0];
        return $folded;
    }
}
