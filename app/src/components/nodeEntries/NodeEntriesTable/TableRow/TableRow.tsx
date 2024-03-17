import { Box, Td, Tr, Thead, Tooltip, HStack, Text, Badge } from "@chakra-ui/react";
import { DatasetEntrySplit } from "@prisma/client";

import dayjs from "~/utils/dayjs";
import { useIsClientInitialized } from "~/utils/hooks";
import { SortableHeader } from "~/components/sorting";
import type { NodeEntryRow, SortableField } from "./types";
import ExpandableRow from "./ExpandableRow";

export const TableHeader = () => {
  const isClientInitialized = useIsClientInitialized();
  if (!isClientInitialized) return null;

  return (
    <Thead>
      <Tr>
        <SortableHeader<SortableField> title="Created At" field="persistentId" />
        <SortableHeader<SortableField> isNumeric title="Input Tokens" field="inputTokens" />
        <SortableHeader<SortableField> isNumeric title="Output Tokens" field="outputTokens" />
        <SortableHeader<SortableField> isNumeric title="Split" field="split" />
      </Tr>
    </Thead>
  );
};

export const TableRow = ({
  nodeEntry,
  isSelected,
  toggleSelected,
  expandable,
}: {
  nodeEntry: NodeEntryRow;
  isSelected: boolean;
  toggleSelected: () => void;
  expandable: boolean;
}) => {
  const createdAt = dayjs(nodeEntry.creationTime).format("MMMM D h:mm A");
  const fullTime = dayjs(nodeEntry.creationTime).toString();

  const isClientInitialized = useIsClientInitialized();
  if (!isClientInitialized) return null;

  return (
    <>
      <Tr
        onClick={toggleSelected}
        key={nodeEntry.id}
        _hover={{ td: { bgColor: isSelected ? "gray.100" : "gray.50", cursor: "pointer" } }}
        bgColor={isSelected ? "gray.50" : undefined}
        transition={!expandable ? "background-color 1.2s" : undefined}
        sx={
          expandable
            ? {
                "> td": { borderBottom: "none" },
              }
            : undefined
        }
        fontSize="sm"
      >
        <Td>
          <Tooltip label={fullTime} placement="top-start">
            <Box whiteSpace="nowrap" minW="120px">
              {createdAt}
            </Box>
          </Tooltip>
        </Td>
        <Td isNumeric>
          {nodeEntry.inputTokens?.toLocaleString() ?? <Text color="gray.500">counting</Text>}
        </Td>
        <Td isNumeric>
          {nodeEntry.outputTokens?.toLocaleString() ?? <Text color="gray.500">counting</Text>}
        </Td>
        <Td isNumeric>
          <EntrySplit split={nodeEntry.split} />
        </Td>
      </Tr>
      {expandable && <ExpandableRow nodeEntry={nodeEntry} expanded={isSelected} />}
    </>
  );
};

const EntrySplit = ({ split }: { split: string }) => {
  const color = split === DatasetEntrySplit.TRAIN ? "orange" : "purple";
  return (
    <HStack justifyContent="flex-end">
      <Badge
        variant="outline"
        w="14"
        p="1px"
        textAlign="center"
        borderRadius={4}
        colorScheme={color}
      >
        {split}
      </Badge>
    </HStack>
  );
};