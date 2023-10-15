import { useState, useEffect, useMemo } from "react";
import { VStack, Card, Grid } from "@chakra-ui/react";

import { useHiddenEvaluationColumns, useTestingEntries } from "~/utils/hooks";
import EvaluationRow, { TableHeader } from "./EvaluationRow";
import EvaluationPaginator from "./EvaluationPaginator";

const EvaluationTable = () => {
  const [refetchInterval, setRefetchInterval] = useState(0);
  const entries = useTestingEntries(refetchInterval).data;

  useEffect(
    () => setRefetchInterval(entries?.pageIncomplete ? 5000 : 0),
    [entries?.pageIncomplete],
  );

  const { hiddenColumns } = useHiddenEvaluationColumns();

  const visibleFineTuneIds = useMemo(() => {
    if (!entries?.deployedFineTunes) return [];
    return entries.deployedFineTunes
      .filter((ft) => !hiddenColumns.includes(ft.slug))
      .map((ft) => ft.id);
  }, [entries?.deployedFineTunes, hiddenColumns]);

  if (!entries) return null;

  return (
    <VStack
      w="full"
      h="full"
      justifyContent="space-between"
      overflowX="auto"
      overflowY="auto"
      mx={8}
    >
      <VStack w="full" alignItems="flex-start" spacing={4}>
        <Card id="card" w="full" minW="fit-content" variant="outline">
          <Grid
            display="grid"
            gridTemplateColumns={
              visibleFineTuneIds.length
                ? `550px repeat(${visibleFineTuneIds.length + 1}, minmax(320px, 1fr))`
                : `minmax(480px, 2fr) minmax(320px, 1fr)`
            }
            sx={{
              "> *": {
                borderColor: "gray.300",
                padding: 4,
              },
            }}
          >
            <TableHeader visibleFineTuneIds={visibleFineTuneIds} />
            {entries.entries.map((entry) => (
              <EvaluationRow
                key={entry.id}
                messages={entry.messages}
                output={entry.output}
                fineTuneEntries={entry.fineTuneTestDatasetEntries}
                visibleFineTuneIds={visibleFineTuneIds}
              />
            ))}
          </Grid>
        </Card>
      </VStack>
      <EvaluationPaginator py={8} />
    </VStack>
  );
};

export default EvaluationTable;