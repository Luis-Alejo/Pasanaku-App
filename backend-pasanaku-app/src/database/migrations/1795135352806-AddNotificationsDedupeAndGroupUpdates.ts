import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationsDedupeAndGroupUpdates1795135352806 implements MigrationInterface {
    name = 'AddNotificationsDedupeAndGroupUpdates1795135352806'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "group_invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "groupId" uuid NOT NULL, "userId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f7d0b290d6079ae9353d794227d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_group_invitations_group_user" ON "group_invitations"  ("groupId", "userId") `);
        await queryRunner.query(`ALTER TABLE "member_debts" ADD "lastPaymentTxHash" character varying(64)`);
        await queryRunner.query(`ALTER TABLE "round_payments" ADD "txHash" character varying(64)`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "dedupeKey" character varying(160)`);
        await queryRunner.query(`ALTER TYPE "public"."transaction_type_enum" ADD VALUE 'DEPOSIT'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_notifications_dedupe_key" ON "notifications"  ("dedupeKey") `);
        await queryRunner.query(`ALTER TABLE "group_invitations" ADD CONSTRAINT "FK_ab934a07e81281d8da148ee641b" FOREIGN KEY ("groupId") REFERENCES "pasanaku_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_invitations" ADD CONSTRAINT "FK_657b71358f3d34c4f1d4945bb8f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "group_invitations" DROP CONSTRAINT "FK_657b71358f3d34c4f1d4945bb8f"`);
        await queryRunner.query(`ALTER TABLE "group_invitations" DROP CONSTRAINT "FK_ab934a07e81281d8da148ee641b"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_notifications_dedupe_key"`);
        await queryRunner.query(`CREATE TYPE "public"."transaction_type_enum_old" AS ENUM('GUARANTEE_DEPOSIT', 'ROUND_PAYMENT', 'ARREARS_PAYMENT', 'PAYOUT', 'GUARANTEE_REFUND', 'PENALTY_SLASH')`);
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "public"."transaction_type_enum_old" USING "type"::"text"::"public"."transaction_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."transaction_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."transaction_type_enum_old" RENAME TO "transaction_type_enum"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "dedupeKey"`);
        await queryRunner.query(`ALTER TABLE "round_payments" DROP COLUMN "txHash"`);
        await queryRunner.query(`ALTER TABLE "member_debts" DROP COLUMN "lastPaymentTxHash"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_group_invitations_group_user"`);
        await queryRunner.query(`DROP TABLE "group_invitations"`);
    }

}
