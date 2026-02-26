<?php

namespace App\Controller\Api;

use App\DTO\Request\LoginRequest;
use App\DTO\Request\RegisterRequest;
use App\DTO\Response\AuthResponse;
use App\DTO\Response\ErrorResponse;
use App\DTO\Response\TokenResponse;
use App\DTO\Response\UserResponse;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\CoupleContextService;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api')]
class AuthController extends AbstractApiController
{
    public function __construct(
        SerializerInterface $serializer,
        ValidatorInterface $validator,
        CoupleContextService $coupleContextService,
        private UserPasswordHasherInterface $passwordHasher,
        private JWTTokenManagerInterface $jwtManager,
        private EntityManagerInterface $entityManager,
        private UserRepository $userRepository
    ) {
        parent::__construct($serializer, $validator, $coupleContextService);
    }

    #[Route('/auth/register', name: 'api_auth_register', methods: ['POST'])]
    public function register(Request $request): JsonResponse
    {
        $dto = $this->deserialize($request, RegisterRequest::class);

        if ($error = $this->validateAndReturn($dto)) {
            return $error;
        }

        // Check email uniqueness
        $existingUser = $this->userRepository->findOneBy(['email' => $dto->email]);
        if ($existingUser !== null) {
            return $this->json(
                ErrorResponse::validation(['email' => 'Email already registered']),
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        // Create user
        $user = new User();
        $user->setEmail($dto->email);
        $user->setDisplayName($dto->displayName);
        $user->setPassword($this->passwordHasher->hashPassword($user, $dto->password));

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        // Generate token
        $token = $this->jwtManager->create($user);

        return $this->json(
            AuthResponse::fromEntity($user, $token),
            Response::HTTP_CREATED
        );
    }

    #[Route('/auth/login', name: 'api_auth_login', methods: ['POST'])]
    public function login(Request $request): JsonResponse
    {
        $dto = $this->deserialize($request, LoginRequest::class);

        if ($error = $this->validateAndReturn($dto)) {
            return $error;
        }

        // Find user
        $user = $this->userRepository->findOneBy(['email' => $dto->email]);
        if ($user === null || !$this->passwordHasher->isPasswordValid($user, $dto->password)) {
            return $this->json(
                ErrorResponse::simple('Invalid credentials'),
                Response::HTTP_UNAUTHORIZED
            );
        }

        // Generate token
        $token = $this->jwtManager->create($user);

        return $this->json(new TokenResponse($token));
    }

    #[Route('/me', name: 'api_me', methods: ['GET'])]
    public function me(): JsonResponse
    {
        return $this->json(UserResponse::fromEntity($this->getCurrentUser()));
    }
}