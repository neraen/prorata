<?php

namespace App\DTO\Request;

use Symfony\Component\Validator\Constraints as Assert;

class SettingsRequest
{
    #[Assert\NotBlank(message: 'Mode is required')]
    #[Assert\Choice(choices: ['income', 'percentage', 'equal'], message: 'Mode must be income, percentage or equal')]
    public string $mode = '';

    /**
     * @var MemberSettingsData[]
     */
    #[Assert\Valid]
    public array $members = [];
}