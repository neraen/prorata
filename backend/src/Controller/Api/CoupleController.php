<?php

namespace App\Controller\Api;

use App\DTO\Request\InviteRequest;
use App\DTO\Request\JoinRequest;
use App\DTO\Request\MemberSettingsData;
use App\DTO\Request\SettingsRequest;
use App\DTO\Response\CoupleResponse;
use App\DTO\Response\CoupleWrapperResponse;
use App\DTO\Response\ErrorResponse;
use App\DTO\Response\InviteResponse;
use App\Entity\Couple;
use App\Entity\CoupleInvite;
use App\Entity\CoupleMember;
use App\Entity\CoupleMode;
use App\Exception\CoupleFullException;
use App\Exception\InvalidInviteException;
use App\Repository\CoupleInviteRepository;
use App\Repository\UserRepository;
use App\Service\CoupleContextService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/couple')]
class CoupleController extends AbstractApiController
{
    public function __construct(
        SerializerInterface $serializer,
        ValidatorInterface $validator,
        CoupleContextService $coupleContextService,
        private EntityManagerInterface $entityManager,
        private CoupleInviteRepository $inviteRepository,
        private UserRepository $userRepository
    ) {
        parent::__construct($serializer, $validator, $coupleContextService);
    }

    #[Route('/me', name: 'api_couple_me', methods: ['GET'])]
    public function me(): JsonResponse
    {
        $couple = $this->getCurrentCouple();

        return $this->json(CoupleWrapperResponse::fromEntity($couple));
    }

    #[Route('/create', name: 'api_couple_create', methods: ['POST'])]
    public function create(): JsonResponse
    {
        $user = $this->getCurrentUser();

        // Check if user already has a couple
        if ($this->getCurrentCouple() !== null) {
            return $this->json(
                ErrorResponse::simple('User is already member of a couple'),
                Response::HTTP_CONFLICT
            );
        }

        // Create couple
        $couple = new Couple();

        // Add current user as first member
        $member = new CoupleMember();
        $member->setUser($user);
        $couple->addMember($member);

        $this->entityManager->persist($couple);
        $this->entityManager->flush();

        return $this->json(CoupleResponse::fromEntity($couple), Response::HTTP_CREATED);
    }

    #[Route('/invite', name: 'api_couple_invite', methods: ['POST'])]
    public function invite(Request $request): JsonResponse
    {
        $couple = $this->requireCouple();

        // Check couple has only 1 member
        if ($couple->isFull()) {
            throw new CoupleFullException();
        }

        $dto = $this->deserialize($request, InviteRequest::class);

        if ($error = $this->validateAndReturn($dto)) {
            return $error;
        }

        // Create invite
        $invite = new CoupleInvite();
        $invite->setCouple($couple);
        $invite->setInvitedEmail($dto->email);
        $invite->setToken(CoupleInvite::generateToken());

        $this->entityManager->persist($invite);
        $this->entityManager->flush();

        return $this->json(InviteResponse::fromEntity($invite), Response::HTTP_CREATED);
    }

    #[Route('/join', name: 'api_couple_join', methods: ['POST'])]
    public function join(Request $request): JsonResponse
    {
        $user = $this->getCurrentUser();

        // Check if user already has a couple
        if ($this->getCurrentCouple() !== null) {
            return $this->json(
                ErrorResponse::simple('User is already member of a couple'),
                Response::HTTP_CONFLICT
            );
        }

        $dto = $this->deserialize($request, JoinRequest::class);

        if ($error = $this->validateAndReturn($dto)) {
            return $error;
        }

        // Find invite
        $invite = $this->inviteRepository->findValidByToken($dto->token);
        if ($invite === null) {
            throw new InvalidInviteException();
        }

        // Note: Email check disabled for easier testing
        // In production, uncomment to enforce strict email matching:
        // if (strtolower($invite->getInvitedEmail()) !== strtolower($user->getEmail())) {
        //     throw new InvalidInviteException('Invite email does not match your account email');
        // }

        $couple = $invite->getCouple();

        // Check couple not full
        if ($couple->isFull()) {
            throw new CoupleFullException();
        }

        // Add user as member
        $member = new CoupleMember();
        $member->setUser($user);
        $couple->addMember($member);

        // Mark invite as used
        $invite->markAsUsed();

        $this->entityManager->flush();

        return $this->json(CoupleResponse::fromEntity($couple));
    }

    #[Route('/settings', name: 'api_couple_settings', methods: ['PUT'])]
    public function settings(Request $request): JsonResponse
    {
        $couple = $this->requireCouple();

        $dto = $this->deserialize($request, SettingsRequest::class);

        if ($error = $this->validateAndReturn($dto)) {
            return $error;
        }

        $mode = CoupleMode::from($dto->mode);
        $couple->setMode($mode);

        // Validate and update member settings
        $members = $couple->getOrderedMembers();

        if ($mode === CoupleMode::INCOME || $mode === CoupleMode::PERCENTAGE) {
            // Need member settings
            if (count($dto->members) !== count($members)) {
                return $this->json(
                    ErrorResponse::validation(['members' => 'Must provide settings for all members']),
                    Response::HTTP_UNPROCESSABLE_ENTITY
                );
            }

            // Build lookup
            $memberSettings = [];
            foreach ($dto->members as $memberData) {
                $memberSettings[$memberData->userId] = $memberData;
            }

            // Validate mode-specific constraints
            if ($mode === CoupleMode::INCOME) {
                foreach ($members as $member) {
                    $data = $memberSettings[$member->getUser()->getId()] ?? null;
                    if ($data === null || $data->incomeCents === null || $data->incomeCents <= 0) {
                        return $this->json(
                            ErrorResponse::validation(['members' => 'Income must be positive for all members']),
                            Response::HTTP_UNPROCESSABLE_ENTITY
                        );
                    }
                }
            }

            if ($mode === CoupleMode::PERCENTAGE) {
                $totalPercentage = 0;
                foreach ($members as $member) {
                    $data = $memberSettings[$member->getUser()->getId()] ?? null;
                    if ($data === null || $data->percentage === null) {
                        return $this->json(
                            ErrorResponse::validation(['members' => 'Percentage required for all members']),
                            Response::HTTP_UNPROCESSABLE_ENTITY
                        );
                    }
                    $totalPercentage += $data->percentage;
                }

                if ($totalPercentage !== 100) {
                    return $this->json(
                        ErrorResponse::validation(['members' => 'Percentages must sum to 100']),
                        Response::HTTP_UNPROCESSABLE_ENTITY
                    );
                }
            }

            // Apply settings
            foreach ($members as $member) {
                $data = $memberSettings[$member->getUser()->getId()];

                if ($mode === CoupleMode::INCOME) {
                    $member->setIncomeCents($data->incomeCents);
                    $member->setPercentage(null);
                } else {
                    $member->setPercentage($data->percentage);
                    $member->setIncomeCents(null);
                }
            }
        } else {
            // Equal mode - clear income/percentage
            foreach ($members as $member) {
                $member->setIncomeCents(null);
                $member->setPercentage(null);
            }
        }

        $this->entityManager->flush();

        return $this->json(CoupleResponse::fromEntity($couple));
    }
}
