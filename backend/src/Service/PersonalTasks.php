<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/** Private tasks stored alongside household data, exposed only through the owner-scoped API. */
final class PersonalTasks
{
    public static function visible(array $tasks, int $userId): array
    {
        return array_values(array_map(function (array $task) {
            unset($task['ownerId']);
            return $task;
        }, array_filter($tasks, fn ($task) => $task['ownerId'] === $userId)));
    }

    public static function apply(array $tasks, string $type, array $payload, int $userId): array
    {
        $id = $payload['id'] ?? null;
        if (!is_string($id) || !preg_match('/^[a-zA-Z0-9-]{1,100}$/D', $id)) throw new BadRequestHttpException('Tâche invalide.');
        $existing = array_find($tasks, fn ($task) => $task['id'] === $id);
        if ($existing && $existing['ownerId'] !== $userId) throw new NotFoundHttpException('Tâche introuvable.');
        if ($type === 'task.add') {
            if ($existing) return $tasks;
            $own = array_filter($tasks, fn ($task) => $task['ownerId'] === $userId);
            if (count(array_filter($own, fn ($task) => !$task['archived'])) >= 200) throw new BadRequestHttpException('Ta liste est bien remplie. Range quelques tâches terminées avant d’en ajouter.');
            $tasks[] = ['id' => $id, 'title' => self::title($payload['title'] ?? null), 'ownerId' => $userId, 'completed' => false, 'archived' => false, 'createdAt' => (new \DateTimeImmutable())->format(DATE_ATOM)];
            return $tasks;
        }
        if (!$existing) throw new NotFoundHttpException('Tâche introuvable.');
        if ($type === 'task.set') {
            if (!array_key_exists('title', $payload) && !array_key_exists('completed', $payload)) throw new BadRequestHttpException('Aucune modification.');
            if (array_key_exists('title', $payload)) $existing['title'] = self::title($payload['title']);
            if (array_key_exists('completed', $payload)) {
                if (!is_bool($payload['completed'])) throw new BadRequestHttpException('État de tâche invalide.');
                $existing['completed'] = $payload['completed'];
            }
        } elseif ($type === 'task.archive') {
            if (!is_bool($payload['archived'] ?? null)) throw new BadRequestHttpException('État de tâche invalide.');
            if (!$payload['archived'] && $existing['archived'] && count(array_filter($tasks, fn ($task) => $task['ownerId'] === $userId && !$task['archived'])) >= 200) throw new BadRequestHttpException('Range une tâche pour libérer une place.');
            $existing['archived'] = $payload['archived'];
        } else {
            throw new BadRequestHttpException('Action inconnue.');
        }
        return array_values(array_map(fn ($task) => $task['id'] === $id ? $existing : $task, $tasks));
    }

    private static function title(mixed $title): string
    {
        if (!is_string($title) || trim($title) === '' || mb_strlen($title) > 200) throw new BadRequestHttpException('Écris une tâche de 1 à 200 caractères.');
        return trim($title);
    }
}
