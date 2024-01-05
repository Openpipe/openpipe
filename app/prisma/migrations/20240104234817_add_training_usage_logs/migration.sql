-- AlterEnum
ALTER TYPE "UsageType" ADD VALUE 'TRAINING';

-- AlterTable
ALTER TABLE "FineTune" ADD COLUMN     "numEpochs" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "FineTuneTrainingEntry" ADD COLUMN     "outputTokens" INTEGER,
ADD COLUMN     "prunedInputTokens" INTEGER;
