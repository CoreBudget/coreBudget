-- CreateTable
CREATE TABLE "UserSidebarVisibilityPreference" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "pageKey" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSidebarVisibilityPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSidebarVisibilityPreference_userId_pageKey_key" ON "UserSidebarVisibilityPreference"("userId", "pageKey");

-- AddForeignKey
ALTER TABLE "UserSidebarVisibilityPreference" ADD CONSTRAINT "UserSidebarVisibilityPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
