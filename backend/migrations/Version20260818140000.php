<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Private per-person expenses, one-off or monthly.
 */
final class Version20260818140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add personal_expense table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE personal_expense (
            id INT AUTO_INCREMENT NOT NULL,
            owner_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            category VARCHAR(50) NOT NULL,
            amount_cents INT NOT NULL,
            currency VARCHAR(3) NOT NULL,
            recurrence VARCHAR(20) DEFAULT \'none\' NOT NULL,
            starts_on DATE NOT NULL COMMENT \'(DC2Type:date_immutable)\',
            ends_on DATE DEFAULT NULL COMMENT \'(DC2Type:date_immutable)\',
            created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            INDEX IDX_PERSONAL_OWNER_STARTS_AT (owner_id, starts_on),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        $this->addSql('ALTER TABLE personal_expense ADD CONSTRAINT FK_PERSONAL_EXPENSE_OWNER FOREIGN KEY (owner_id) REFERENCES `user` (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE personal_expense DROP FOREIGN KEY FK_PERSONAL_EXPENSE_OWNER');
        $this->addSql('DROP TABLE personal_expense');
    }
}
