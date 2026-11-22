import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateMinReputationDefault1795310782416 implements MigrationInterface {
    name = 'UpdateMinReputationDefault1795310782416'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pasanaku_groups" ALTER COLUMN "minReputationReq" SET DEFAULT '41'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pasanaku_groups" ALTER COLUMN "minReputationReq" SET DEFAULT '80'`);
    }

}
