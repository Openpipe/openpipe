import { Text, VStack, HStack, Tooltip, Box, Icon, GridItem } from "@chakra-ui/react";
import Link from "next/link";
import { type ChatCompletionMessage } from "openai/resources/chat";
import { BsQuestionCircle } from "react-icons/bs";
import SyntaxHighlighter from "react-syntax-highlighter";

import ColoredPercent from "~/components/ColoredPercent";
import { type RouterOutputs } from "~/utils/api";
import { useFineTuneTestingStats, useTestingEntries } from "~/utils/hooks";

export const TableHeader = ({ visibleFineTuneIds }: { visibleFineTuneIds: string[] }) => {
  const sharedProps = {
    borderLeftWidth: 1,
  };
  return (
    <>
      <GridItem borderLeftWidth={0}>
        <Text fontWeight="bold" color="gray.500">
          Input
        </Text>
      </GridItem>
      <GridItem {...sharedProps}>
        <Text fontWeight="bold" color="gray.500">
          Original Output
        </Text>
      </GridItem>
      {visibleFineTuneIds.map((fineTuneId) => (
        <GridItem key={fineTuneId} {...sharedProps}>
          <FineTuneHeading fineTuneId={fineTuneId} />
        </GridItem>
      ))}
    </>
  );
};

const FineTuneHeading = ({ fineTuneId }: { fineTuneId: string }) => {
  const stats = useFineTuneTestingStats(fineTuneId).data;
  const entries = useTestingEntries().data;

  if (!stats || !entries) return <GridItem />;

  return (
    <VStack alignItems="flex-start">
      <Text
        as={Link}
        href={{ pathname: "/fine-tunes/[id]", query: { id: fineTuneId } }}
        _hover={{ textDecoration: "underline" }}
        fontWeight="bold"
        color="gray.500"
      >
        {stats.slug}
      </Text>

      <HStack>
        {stats.averageScore && (
          <>
            <ColoredPercent value={stats.averageScore} />
            <Tooltip
              label={
                <>
                  <Text>
                    % of fields from the ground truth that are exactly matched in the model's
                    output.
                  </Text>
                  <Text>We'll let you customize this calculation in the future.</Text>
                </>
              }
              aria-label="Help about accuracy"
            >
              <Box lineHeight={0}>
                <Icon as={BsQuestionCircle} color="gray.600" boxSize={4} />
              </Box>
            </Tooltip>
          </>
        )}

        {stats.countFinished < entries.count && (
          <Text>
            {stats.countFinished}/{entries.count}
          </Text>
        )}
      </HStack>
    </VStack>
  );
};

type TestingEntry = RouterOutputs["datasetEntries"]["listTestingEntries"]["entries"][number];

const EvaluationRow = ({
  messages,
  output,
  fineTuneEntries,
  visibleFineTuneIds,
}: {
  messages: TestingEntry["messages"];
  output: TestingEntry["output"];
  fineTuneEntries: TestingEntry["fineTuneTestDatasetEntries"];
  visibleFineTuneIds: string[];
}) => {
  const orderedFineTuneEntries = visibleFineTuneIds.map(
    (fineTuneId) =>
      fineTuneEntries.find((entry) => entry.fineTuneId === fineTuneId) || {
        fineTuneId,
        output: null,
        errorMessage: null,
        score: null,
      },
  );

  const sharedProps = {
    borderTopWidth: 1,
    borderLeftWidth: 1,
  };

  return (
    <>
      <GridItem {...sharedProps} borderLeftWidth={0}>
        <FormattedInput messages={messages} />
      </GridItem>
      <GridItem {...sharedProps}>
        <FormattedOutput output={output} />
      </GridItem>
      {orderedFineTuneEntries.map((entry) => (
        <GridItem key={entry.fineTuneId} {...sharedProps}>
          <FormattedOutput
            output={entry.output}
            errorMessage={entry.errorMessage}
            score={entry.score}
          />
        </GridItem>
      ))}
    </>
  );
};

const FormattedInput = ({ messages }: { messages: TestingEntry["messages"] }) => {
  return (
    <VStack alignItems="flex-start" spacing={8}>
      {(messages as unknown as ChatCompletionMessage[]).map((message, index) => (
        <VStack key={index} alignItems="flex-start" w="full">
          <Text fontWeight="bold" color="gray.500">
            {message.role}
          </Text>
          <FormattedMessage message={message} />
        </VStack>
      ))}
    </VStack>
  );
};

const FormattedOutput = ({
  output,
  score,
  errorMessage,
}: {
  output: TestingEntry["output"];
  score?: number | null;
  errorMessage?: string | null;
}) => {
  if (errorMessage) {
    return <Text color="red.500">{errorMessage}</Text>;
  }

  if (!output) return <Text color="gray.500">Pending</Text>;

  const message = output as unknown as ChatCompletionMessage;
  return <FormattedMessage message={message} score={score} />;
};

const FormattedMessage = ({
  message,
  score,
}: {
  message: ChatCompletionMessage;
  score?: number | null;
}) => {
  if (message.function_call) {
    const { name, arguments: args } = message.function_call;
    let parsedArgs = null;
    try {
      if (args) parsedArgs = JSON.parse(args);
    } catch (e) {
      // ignore
    }
    return (
      <VStack alignItems="flex-start" whiteSpace="pre-wrap">
        <HStack justifyContent="space-between" w="full">
          <Text fontWeight="bold">{name}</Text>
          {score !== null && score !== undefined && <ColoredPercent value={score} />}
        </HStack>
        {args &&
          (parsedArgs ? (
            <SyntaxHighlighter
              customStyle={{
                overflowX: "unset",
                width: "100%",
                flex: 1,
                backgroundColor: "#f0f0f0",
              }}
              language="json"
              lineProps={{
                style: { wordBreak: "break-all", whiteSpace: "pre-wrap" },
              }}
              wrapLines
            >
              {JSON.stringify(JSON.parse(args), null, 4)}
            </SyntaxHighlighter>
          ) : (
            <Text>{args}</Text>
          ))}
      </VStack>
    );
  }
  return <Text>{message.content}</Text>;
};

export default EvaluationRow;