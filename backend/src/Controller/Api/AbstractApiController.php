<?php

namespace App\Controller\Api;

use App\DTO\Response\ErrorResponse;
use App\Entity\Couple;
use App\Entity\User;
use App\Service\CoupleContextService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

abstract class AbstractApiController extends AbstractController
{
    public function __construct(
        protected SerializerInterface $serializer,
        protected ValidatorInterface $validator,
        protected CoupleContextService $coupleContextService
    ) {}

    protected function getCurrentUser(): User
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException('User not authenticated');
        }

        return $user;
    }

    protected function getCurrentCouple(): ?Couple
    {
        return $this->coupleContextService->getCurrentCouple($this->getCurrentUser());
    }

    protected function requireCouple(): Couple
    {
        $couple = $this->getCurrentCouple();
        if ($couple === null) {
            throw $this->createNotFoundException('User is not member of any couple');
        }

        return $couple;
    }

    protected function deserialize(Request $request, string $class): object
    {
        $content = $request->getContent();

        return $this->serializer->deserialize($content, $class, 'json');
    }

    protected function validateAndReturn(object $dto): ?JsonResponse
    {
        $violations = $this->validator->validate($dto);

        if (count($violations) > 0) {
            $errors = [];
            foreach ($violations as $violation) {
                $errors[$violation->getPropertyPath()] = $violation->getMessage();
            }

            return $this->json(
                ErrorResponse::validation($errors),
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        return null;
    }

    protected function json(mixed $data, int $status = 200, array $headers = [], array $context = []): JsonResponse
    {
        $json = $this->serializer->serialize($data, 'json', $context);

        return new JsonResponse($json, $status, $headers, true);
    }
}