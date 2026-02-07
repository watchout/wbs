-- Add platform admin fields
ALTER TABLE "Organization" ADD COLUMN "isSystemOrg" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Create PlanConfig table
CREATE TABLE "PlanConfig" (
    "id" TEXT NOT NULL,
    "planType" "PlanType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPrice" INTEGER NOT NULL,
    "annualPrice" INTEGER,
    "maxUsers" INTEGER NOT NULL,
    "monthlyAiCredits" INTEGER NOT NULL,
    "features" TEXT[],
    "featureLabels" TEXT[],
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stripePriceIdMonthly" TEXT,
    "stripePriceIdAnnual" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanConfig_pkey" PRIMARY KEY ("id")
);

-- Create CreditPackConfig table
CREATE TABLE "CreditPackConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "stripePriceId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditPackConfig_pkey" PRIMARY KEY ("id")
);

-- Create CohortConfig table
CREATE TABLE "CohortConfig" (
    "id" TEXT NOT NULL,
    "cohortNumber" INTEGER NOT NULL,
    "maxOrgs" INTEGER NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "stripeCouponId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CohortConfig_pkey" PRIMARY KEY ("id")
);

-- Add unique constraints
CREATE UNIQUE INDEX "PlanConfig_planType_key" ON "PlanConfig"("planType");
CREATE UNIQUE INDEX "CohortConfig_cohortNumber_key" ON "CohortConfig"("cohortNumber");
