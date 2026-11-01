<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261101200000 extends AbstractMigration
{
    public function getDescription(): string { return 'Add meal assistant drafts, approvals and daily usage accounting'; }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE meal_assistant_run (
            id VARCHAR(36) NOT NULL,
            couple_id INT NOT NULL,
            created_by_user_id INT NOT NULL,
            status VARCHAR(16) NOT NULL,
            model VARCHAR(100) NOT NULL,
            request_hash VARCHAR(64) NOT NULL,
            context_hash VARCHAR(64) NOT NULL,
            result JSON DEFAULT NULL,
            token_usage JSON DEFAULT NULL,
            created_at DATETIME NOT NULL,
            accepted_at DATETIME DEFAULT NULL,
            INDEX IDX_MEAL_ASSISTANT_COUPLE_DATE (couple_id, created_at),
            INDEX IDX_MEAL_ASSISTANT_CREATOR (created_by_user_id),
            PRIMARY KEY(id),
            CONSTRAINT FK_MEAL_ASSISTANT_COUPLE FOREIGN KEY (couple_id) REFERENCES couple (id) ON DELETE CASCADE,
            CONSTRAINT FK_MEAL_ASSISTANT_CREATOR FOREIGN KEY (created_by_user_id) REFERENCES `user` (id) ON DELETE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB');
    }

    public function down(Schema $schema): void { $this->addSql('DROP TABLE meal_assistant_run'); }
}
