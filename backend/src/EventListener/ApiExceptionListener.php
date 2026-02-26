<?php

namespace App\EventListener;

use App\DTO\Response\ErrorResponse;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Serializer\SerializerInterface;

#[AsEventListener(event: KernelEvents::EXCEPTION, priority: 100)]
class ApiExceptionListener
{
    public function __construct(
        private SerializerInterface $serializer
    ) {}

    public function __invoke(ExceptionEvent $event): void
    {
        $request = $event->getRequest();

        // Only handle API requests
        if (!str_starts_with($request->getPathInfo(), '/api')) {
            return;
        }

        $exception = $event->getThrowable();
        $statusCode = Response::HTTP_INTERNAL_SERVER_ERROR;

        if ($exception instanceof HttpExceptionInterface) {
            $statusCode = $exception->getStatusCode();
        }

        $errorResponse = ErrorResponse::simple($exception->getMessage());

        $json = $this->serializer->serialize($errorResponse, 'json');

        $response = new JsonResponse($json, $statusCode, [], true);

        $event->setResponse($response);
    }
}