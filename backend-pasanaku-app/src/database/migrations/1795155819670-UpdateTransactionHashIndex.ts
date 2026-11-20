import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTransactionHashIndex1795155819670 implements MigrationInterface {
    name = 'UpdateTransactionHashIndex1795155819670'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_transactions_stellar_hash"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "UQ_0228cd43c585de1599b3b9fbc05"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_transactions_stellar_hash" ON "transactions"  ("stellarTxHash", "userId", "type") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_transactions_stellar_hash"`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "UQ_0228cd43c585de1599b3b9fbc05" UNIQUE ("stellarTxHash")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_transactions_stellar_hash" ON "transactions" USING btree ("stellarTxHash") `);
    }

}
