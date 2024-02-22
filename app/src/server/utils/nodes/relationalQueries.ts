import { kysely } from "~/server/db";
import { LLMRelabelOutput, MonitorOutput } from "~/server/utils/nodes/node.types";

export const getDownstreamDatasets = (filterNodeId: string) => {
  return kysely
    .selectFrom("Node as filterNode")
    .where("filterNode.id", "=", filterNodeId)
    .innerJoin("NodeOutput as filterNodeOutput", "filterNodeOutput.nodeId", "filterNode.id")
    .where("filterNodeOutput.label", "=", MonitorOutput.MatchedLogs)
    .innerJoin("DataChannel as dc", "dc.originId", "filterNodeOutput.id")
    .innerJoin("Node as monitorLLMRelabelNode", "monitorLLMRelabelNode.id", "dc.destinationId")
    .innerJoin(
      "NodeOutput as monitorLLMRelabelNodeOutput",
      "monitorLLMRelabelNodeOutput.nodeId",
      "monitorLLMRelabelNode.id",
    )
    .where("monitorLLMRelabelNodeOutput.label", "=", LLMRelabelOutput.Relabeled)
    .innerJoin("DataChannel as dc2", "dc2.originId", "monitorLLMRelabelNodeOutput.id")
    .innerJoin("Node as datasetLLMRelabelNode", "datasetLLMRelabelNode.id", "dc2.destinationId")
    .innerJoin(
      "NodeOutput as datasetLLMRelabelNodeOutput",
      "datasetLLMRelabelNodeOutput.nodeId",
      "datasetLLMRelabelNode.id",
    )
    .where("datasetLLMRelabelNodeOutput.label", "=", LLMRelabelOutput.Relabeled)
    .innerJoin("DataChannel as dc3", "dc3.originId", "datasetLLMRelabelNodeOutput.id")
    .innerJoin("Node as manualRelabelNode", "manualRelabelNode.id", "dc3.destinationId")
    .innerJoin(
      "NodeOutput as manualRelabelNodeOutput",
      "manualRelabelNodeOutput.nodeId",
      "manualRelabelNode.id",
    )
    .innerJoin("DataChannel as dc4", "dc4.originId", "manualRelabelNodeOutput.id")
    .innerJoin("Node as datasetNode", "datasetNode.id", "dc4.destinationId")
    .innerJoin("Dataset as d", "d.nodeId", "datasetNode.id")
    .distinctOn("datasetNode.id");
};

export const getUpstreamSources = ({ llmRelabelNodeId }: { llmRelabelNodeId: string }) => {
  return kysely
    .selectFrom("Node as datasetLLMRelabelNode")
    .where("datasetLLMRelabelNode.id", "=", llmRelabelNodeId)
    .innerJoin("DataChannel as dc1", "dc1.destinationId", "datasetLLMRelabelNode.id")
    .innerJoin("NodeOutput as sourceNodeOutput", "sourceNodeOutput.id", "dc1.originId")
    .innerJoin("Node as sourceNode", "sourceNode.id", "sourceNodeOutput.nodeId")
    .distinctOn("sourceNode.id");
};