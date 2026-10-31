<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Per-expense split modes (prorata / 50-50 / fully charged to one member)
 * and money transfers between members.
 */
final class Version20260818120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add expense split modes and transfer table';
    }

    public function up(Schema $schema): void
    {
        // Split mode on expenses; existing rows keep the historical prorata behaviour
        $this->addSql('ALTER TABLE expense
            ADD split_mode VARCHAR(20) DEFAULT \'prorata\' NOT NULL,
            ADD charged_to_id INT DEFAULT NULL');
        $this->addSql('CREATE INDEX IDX_EXPENSE_CHARGED_TO ON expense (charged_to_id)');
        $this->addSql('ALTER TABLE expense ADD CONSTRAINT FK_EXPENSE_CHARGED_TO FOREIGN KEY (charged_to_id) REFERENCES `user` (id) ON DELETE SET NULL');

        // Transfers actually made between the two members
        $this->addSql('CREATE TABLE transfer (
            id INT AUTO_INCREMENT NOT NULL,
            couple_id INT NOT NULL,
            from_user_id INT NOT NULL,
            to_user_id INT NOT NULL,
            amount_cents INT NOT NULL,
            currency VARCHAR(3) NOT NULL,
            transferred_at DATE NOT NULL COMMENT \'(DC2Type:date_immutable)\',
            note VARCHAR(255) DEFAULT NULL,
            created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            INDEX IDX_COUPLE_TRANSFERRED_AT (couple_id, transferred_at),
            INDEX IDX_TRANSFER_FROM_USER (from_user_id),
            INDEX IDX_TRANSFER_TO_USER (to_user_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        $this->addSql('ALTER TABLE transfer ADD CONSTRAINT FK_TRANSFER_COUPLE FOREIGN KEY (couple_id) REFERENCES couple (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE transfer ADD CONSTRAINT FK_TRANSFER_FROM_USER FOREIGN KEY (from_user_id) REFERENCES `user` (id)');
        $this->addSql('ALTER TABLE transfer ADD CONSTRAINT FK_TRANSFER_TO_USER FOREIGN KEY (to_user_id) REFERENCES `user` (id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE transfer DROP FOREIGN KEY FK_TRANSFER_TO_USER');
        $this->addSql('ALTER TABLE transfer DROP FOREIGN KEY FK_TRANSFER_FROM_USER');
        $this->addSql('ALTER TABLE transfer DROP FOREIGN KEY FK_TRANSFER_COUPLE');
        $this->addSql('DROP TABLE transfer');

        $this->addSql('ALTER TABLE expense DROP FOREIGN KEY FK_EXPENSE_CHARGED_TO');
        $this->addSql('DROP INDEX IDX_EXPENSE_CHARGED_TO ON expense');
        $this->addSql('ALTER TABLE expense DROP split_mode, DROP charged_to_id');
    }
}
