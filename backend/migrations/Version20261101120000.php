<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261101120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add couple meal planning and shared shopping state with optimistic concurrency';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE couple ADD household_data JSON DEFAULT NULL, ADD household_revision INT DEFAULT 0 NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE couple DROP household_data, DROP household_revision');
    }
}
