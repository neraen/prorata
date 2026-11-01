<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20261101230000 extends AbstractMigration
{
    public function getDescription(): string { return 'Distinguish recipe classification calls from meal planning drafts'; }
    public function up(Schema $schema): void { $this->addSql("ALTER TABLE meal_assistant_run ADD purpose VARCHAR(20) DEFAULT 'plan' NOT NULL"); }
    public function down(Schema $schema): void { $this->addSql('ALTER TABLE meal_assistant_run DROP purpose'); }
}
