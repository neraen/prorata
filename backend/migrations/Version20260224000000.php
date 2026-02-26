<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Migration for Prorata couple expense management entities.
 */
final class Version20260224000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add couple expense management tables';
    }

    public function up(Schema $schema): void
    {
        // Update user table
        $this->addSql('ALTER TABLE `user` ADD display_name VARCHAR(100) NOT NULL, ADD created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\'');

        // Create couple table
        $this->addSql('CREATE TABLE couple (
            id INT AUTO_INCREMENT NOT NULL,
            mode VARCHAR(20) NOT NULL,
            created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        // Create couple_member table
        $this->addSql('CREATE TABLE couple_member (
            id INT AUTO_INCREMENT NOT NULL,
            couple_id INT NOT NULL,
            user_id INT NOT NULL,
            income_cents INT DEFAULT NULL,
            percentage INT DEFAULT NULL,
            created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            INDEX IDX_COUPLE_MEMBER_COUPLE (couple_id),
            UNIQUE INDEX UNIQ_USER_MEMBERSHIP (user_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        // Create couple_invite table
        $this->addSql('CREATE TABLE couple_invite (
            id INT AUTO_INCREMENT NOT NULL,
            couple_id INT NOT NULL,
            invited_email VARCHAR(180) NOT NULL,
            token VARCHAR(64) NOT NULL,
            created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            used_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            INDEX IDX_COUPLE_INVITE_COUPLE (couple_id),
            UNIQUE INDEX UNIQ_INVITE_TOKEN (token),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        // Create expense table
        $this->addSql('CREATE TABLE expense (
            id INT AUTO_INCREMENT NOT NULL,
            couple_id INT NOT NULL,
            paid_by_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            category VARCHAR(50) NOT NULL,
            amount_cents INT NOT NULL,
            currency VARCHAR(3) NOT NULL,
            spent_at DATE NOT NULL COMMENT \'(DC2Type:date_immutable)\',
            created_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            INDEX IDX_COUPLE_SPENT_AT (couple_id, spent_at),
            INDEX IDX_EXPENSE_PAID_BY (paid_by_id),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        // Create month_closure table
        $this->addSql('CREATE TABLE month_closure (
            id INT AUTO_INCREMENT NOT NULL,
            couple_id INT NOT NULL,
            year INT NOT NULL,
            month INT NOT NULL,
            closed_at DATETIME NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
            snapshot_json JSON NOT NULL,
            INDEX IDX_MONTH_CLOSURE_COUPLE (couple_id),
            UNIQUE INDEX UNIQ_COUPLE_YEAR_MONTH (couple_id, year, month),
            PRIMARY KEY(id)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci` ENGINE = InnoDB');

        // Add foreign keys
        $this->addSql('ALTER TABLE couple_member ADD CONSTRAINT FK_COUPLE_MEMBER_COUPLE FOREIGN KEY (couple_id) REFERENCES couple (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE couple_member ADD CONSTRAINT FK_COUPLE_MEMBER_USER FOREIGN KEY (user_id) REFERENCES `user` (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE couple_invite ADD CONSTRAINT FK_COUPLE_INVITE_COUPLE FOREIGN KEY (couple_id) REFERENCES couple (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE expense ADD CONSTRAINT FK_EXPENSE_COUPLE FOREIGN KEY (couple_id) REFERENCES couple (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE expense ADD CONSTRAINT FK_EXPENSE_PAID_BY FOREIGN KEY (paid_by_id) REFERENCES `user` (id)');
        $this->addSql('ALTER TABLE month_closure ADD CONSTRAINT FK_MONTH_CLOSURE_COUPLE FOREIGN KEY (couple_id) REFERENCES couple (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        // Drop foreign keys first
        $this->addSql('ALTER TABLE month_closure DROP FOREIGN KEY FK_MONTH_CLOSURE_COUPLE');
        $this->addSql('ALTER TABLE expense DROP FOREIGN KEY FK_EXPENSE_PAID_BY');
        $this->addSql('ALTER TABLE expense DROP FOREIGN KEY FK_EXPENSE_COUPLE');
        $this->addSql('ALTER TABLE couple_invite DROP FOREIGN KEY FK_COUPLE_INVITE_COUPLE');
        $this->addSql('ALTER TABLE couple_member DROP FOREIGN KEY FK_COUPLE_MEMBER_USER');
        $this->addSql('ALTER TABLE couple_member DROP FOREIGN KEY FK_COUPLE_MEMBER_COUPLE');

        // Drop tables
        $this->addSql('DROP TABLE month_closure');
        $this->addSql('DROP TABLE expense');
        $this->addSql('DROP TABLE couple_invite');
        $this->addSql('DROP TABLE couple_member');
        $this->addSql('DROP TABLE couple');

        // Revert user table changes
        $this->addSql('ALTER TABLE `user` DROP display_name, DROP created_at');
    }
}