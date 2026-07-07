-- CreateTable
CREATE TABLE "ElectionCategory" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "candidateName" TEXT,
    "yesVotes" INTEGER NOT NULL DEFAULT 0,
    "noVotes" INTEGER NOT NULL DEFAULT 0,
    "invalidVotes" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElectionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "votes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Candidate_categoryId_idx" ON "Candidate"("categoryId");

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ElectionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
