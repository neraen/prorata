<?php

declare(strict_types=1);

namespace App\Tests\Service\MealAssistant;

use App\Service\HouseholdService;
use App\Service\MealAssistant\FoodProfile;
use App\Service\MealAssistant\MealProposalValidator;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;

class MealProposalValidatorTest extends TestCase
{
    public static function requestData(): array
    {
        return ['slots' => [['date' => '2026-11-02', 'slot' => 'dinner']], 'mix' => ['everyday' => 0, 'balanced' => 0, 'pleasure' => 0, 'joker' => 1], 'instructions' => '', 'budgetCents' => null];
    }

    public static function proposalData(): array
    {
        return ['summary' => 'Un dîner sans préparation.', 'warnings' => [], 'assumptions' => [], 'optimizationTips' => [], 'questions' => [], 'meals' => [[
            'date' => '2026-11-02', 'slot' => 'dinner', 'category' => 'joker', 'existingRecipeId' => null,
            'title' => 'Pizza surgelée', 'servings' => 2, 'minutes' => 20, 'equipment' => ['Four'],
            'ingredients' => [['name' => 'Pizza surgelée', 'quantity' => 1, 'unit' => 'piece', 'aisle' => 'frozen']],
            'instructions' => 'Réchauffer selon les instructions du fabricant.', 'reason' => 'Un soir sans cuisine.', 'pantryUsed' => [], 'estimatedCostCents' => 500,
        ]]];
    }

    private function context(): array { return ['profile' => [...FoodProfile::defaults(), 'equipment' => ['Four']], 'retrievedRecipes' => []]; }

    public function testAFullWeekCanContainLunchAndDinnerWithExplicitServings(): void
    {
        $slots = [];
        for ($day = 2; $day <= 8; ++$day) foreach (['lunch', 'dinner'] as $slot) $slots[] = ['date' => '2026-11-0'.$day, 'slot' => $slot];
        $input = [...self::requestData(), 'slots' => $slots, 'servings' => 3, 'mix' => ['everyday' => 14, 'balanced' => 0, 'pleasure' => 0, 'joker' => 0]];
        $request = (new MealProposalValidator())->request($input, HouseholdService::emptyState(), '2026-11-01');
        self::assertCount(14, $request['slots']);
        self::assertSame(3, $request['servings']);
        $input['slots'][] = ['date' => '2026-11-09', 'slot' => 'dinner'];
        $this->expectException(BadRequestHttpException::class);
        (new MealProposalValidator())->request($input, HouseholdService::emptyState(), '2026-11-01');
    }

    public function testJokerRemainsOneReadyMadeProduct(): void
    {
        $result = (new MealProposalValidator())->proposal(self::proposalData(), self::requestData(), $this->context());
        self::assertSame('joker', $result['meals'][0]['category']);
        self::assertCount(1, $result['meals'][0]['ingredients']);
        self::assertSame('piece', $result['meals'][0]['ingredients'][0]['unit']);
    }

    public function testFabricatedRecipeReferenceIsRejected(): void
    {
        $data = self::proposalData(); $data['meals'][0]['existingRecipeId'] = 'someone-elses-recipe';
        $this->expectException(ServiceUnavailableHttpException::class);
        (new MealProposalValidator())->proposal($data, self::requestData(), $this->context());
    }

    public function testWrongCategoryDistributionIsRejected(): void
    {
        $data = self::proposalData(); $data['meals'][0]['category'] = 'pleasure';
        $this->expectException(ServiceUnavailableHttpException::class);
        (new MealProposalValidator())->proposal($data, self::requestData(), $this->context());
    }

    public function testUnavailableEquipmentIsRejected(): void
    {
        $context = $this->context(); $context['profile']['equipment'] = ['Micro-ondes'];
        $this->expectException(ServiceUnavailableHttpException::class);
        (new MealProposalValidator())->proposal(self::proposalData(), self::requestData(), $context);
    }

    public function testObviousAllergenIsRejected(): void
    {
        $data = self::proposalData(); $data['meals'][0]['ingredients'][] = ['name' => 'Cacahuètes', 'quantity' => 20, 'unit' => 'g', 'aisle' => 'pantry'];
        $context = $this->context(); $context['profile']['allergies'] = ['arachide'];
        $this->expectException(ServiceUnavailableHttpException::class);
        (new MealProposalValidator())->proposal($data, self::requestData(), $context);
    }

    public function testAnOverBudgetEstimateIsRejected(): void
    {
        $request = self::requestData(); $request['budgetCents'] = 300;
        $this->expectException(ServiceUnavailableHttpException::class);
        (new MealProposalValidator())->proposal(self::proposalData(), $request, $this->context());
    }

    public function testOccupiedSlotIsRejectedBeforeAnyPaidCall(): void
    {
        $state = HouseholdService::emptyState(); $state['meals']['2026-11-02-dinner'] = ['recipeId' => 'app-pasta'];
        $this->expectException(BadRequestHttpException::class);
        (new MealProposalValidator())->request(self::requestData(), $state, '2026-11-01');
    }

    public function testExistingRecipeUsesCanonicalDataAndScalesPortions(): void
    {
        $recipe = ['id' => 'mine', 'title' => 'Mes raviolis', 'servings' => 4, 'minutes' => 15, 'equipment' => ['Four'], 'ingredients' => [['name' => 'Raviolis préparés', 'quantity' => 800, 'unit' => 'g', 'aisle' => 'pantry']], 'instructions' => 'Suivre la notice.'];
        $context = $this->context(); $context['retrievedRecipes'] = [$recipe];
        $data = self::proposalData(); $data['meals'][0]['existingRecipeId'] = 'mine'; $data['meals'][0]['title'] = 'Titre inventé';
        $result = (new MealProposalValidator())->proposal($data, self::requestData(), $context);
        self::assertSame('Mes raviolis', $result['meals'][0]['title']);
        self::assertEquals(400, $result['meals'][0]['ingredients'][0]['quantity']);
        self::assertSame(2, $result['meals'][0]['servings']);
    }
    public function testSharedStockCannotBeCountedTwice(): void
    {
        $request = self::requestData();
        $request['slots'][] = ['date' => '2026-11-03', 'slot' => 'dinner'];
        $request['mix']['joker'] = 2;
        $data = self::proposalData();
        $data['meals'][0]['ingredients'] = [['name' => 'Carottes', 'quantity' => 400, 'unit' => 'g', 'aisle' => 'produce']];
        $data['meals'][0]['pantryUsed'] = ['Carottes'];
        $data['meals'][] = [...$data['meals'][0], 'date' => '2026-11-03'];
        $context = $this->context();
        $context['profile']['pantry'] = [['name' => 'Carottes', 'quantity' => 0.5, 'unit' => 'kg', 'aisle' => 'produce', 'expiresOn' => null]];
        $result = (new MealProposalValidator())->proposal($data, $request, $context);
        self::assertEquals(400, $result['meals'][0]['pantryAllocations'][0]['quantity']);
        self::assertEquals(100, $result['meals'][1]['pantryAllocations'][0]['quantity']);
        self::assertStringContainsString('300 g', implode(' ', $result['warnings']));
    }

    public function testExpiredStockCannotBeClaimedAsAvailable(): void
    {
        $data = self::proposalData(); $data['meals'][0]['pantryUsed'] = ['Carottes'];
        $context = $this->context();
        $context['profile']['pantry'] = [['name' => 'Carottes', 'quantity' => 500, 'unit' => 'g', 'aisle' => 'produce', 'expiresOn' => '2026-11-01']];
        $this->expectException(ServiceUnavailableHttpException::class);
        (new MealProposalValidator())->proposal($data, self::requestData(), $context);
    }

    public function testFiveMinuteOvenJokerIsRejected(): void
    {
        $data = self::proposalData(); $data['meals'][0]['minutes'] = 5;
        $this->expectException(ServiceUnavailableHttpException::class);
        (new MealProposalValidator())->proposal($data, self::requestData(), $this->context());
    }

    public function testUserCategoryCannotBeSilentlyOverriddenForAReusedRecipe(): void
    {
        $data = self::proposalData();
        $data['meals'][0]['existingRecipeId'] = 'mine';
        $context = $this->context();
        $context['retrievedRecipes'] = [[...$data['meals'][0], 'id' => 'mine', 'category' => 'pleasure', 'categorySource' => 'user']];
        $this->expectException(ServiceUnavailableHttpException::class);
        (new MealProposalValidator())->proposal($data, self::requestData(), $context);
    }

}
