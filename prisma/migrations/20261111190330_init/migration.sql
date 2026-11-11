-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Trip" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromCity" TEXT NOT NULL,
    "toCity" TEXT NOT NULL,
    "departDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3),
    "roundTrip" BOOLEAN NOT NULL DEFAULT true,
    "travellers" INTEGER NOT NULL,
    "days" INTEGER NOT NULL,
    "outbound" JSONB NOT NULL,
    "returnLeg" JSONB,
    "stay" JSONB NOT NULL,
    "restaurants" JSONB,
    "travellerDetails" JSONB,
    "contact" JSONB,
    "specialRequests" TEXT,
    "totalAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "payment" JSONB,
    "bookingRef" TEXT,
    "outboundPnr" TEXT,
    "returnPnr" TEXT,
    "stayConfirmation" TEXT,
    "itinerary" JSONB,
    "notifications" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_bookingRef_key" ON "public"."Trip"("bookingRef");

-- CreateIndex
CREATE INDEX "Trip_userId_idx" ON "public"."Trip"("userId");

-- AddForeignKey
ALTER TABLE "public"."Trip" ADD CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
