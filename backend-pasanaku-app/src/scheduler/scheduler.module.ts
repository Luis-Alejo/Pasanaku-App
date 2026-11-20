import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoundPayment } from '../groups/entities/round-payment.entity.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { ClusterLockService } from './cluster-lock.service.js';
import { RoundAlertsService } from './round-alerts.service.js';
import { RoundSchedulerService } from './round-scheduler.service.js';

// GroupsService llega por GroupsModule (@Global). ScheduleModule.forRoot() va en AppModule.
@Module({
  imports: [
    TypeOrmModule.forFeature([RoundPayment]),
    NotificationsModule,
    PaymentsModule,
  ],
  providers: [ClusterLockService, RoundAlertsService, RoundSchedulerService],
})
export class SchedulerModule {}
