-- CreateTable
CREATE TABLE "ZoneRisk" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Unknown',
    "riskScore" DOUBLE PRECISION NOT NULL,
    "weatherScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "workerShortage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "demandSurge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "regulatoryRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "decisionMode" TEXT NOT NULL DEFAULT 'NORMAL',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZoneRisk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerActivity" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "activeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedOrders" INTEGER NOT NULL DEFAULT 0,
    "avgOrdersPerHour" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sessionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compensation" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Compensation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PremiumPool" (
    "id" TEXT NOT NULL,
    "totalCollected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPayout" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lossRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PremiumPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "signature" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "workerHash" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ZoneRisk_zoneId_idx" ON "ZoneRisk"("zoneId");

-- CreateIndex
CREATE INDEX "ZoneRisk_timestamp_idx" ON "ZoneRisk"("timestamp");

-- CreateIndex
CREATE INDEX "WorkerActivity_workerId_idx" ON "WorkerActivity"("workerId");

-- CreateIndex
CREATE INDEX "WorkerActivity_zoneId_idx" ON "WorkerActivity"("zoneId");

-- CreateIndex
CREATE INDEX "Compensation_workerId_idx" ON "Compensation"("workerId");

-- CreateIndex
CREATE INDEX "Compensation_status_idx" ON "Compensation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- AddForeignKey
ALTER TABLE "WorkerActivity" ADD CONSTRAINT "WorkerActivity_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compensation" ADD CONSTRAINT "Compensation_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
