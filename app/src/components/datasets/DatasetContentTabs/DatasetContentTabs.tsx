import ContentTabs from "~/components/ContentTabs";
import General from "./General/General";
import Evaluation from "./Evaluation/Evaluation";
import Models from "./Models/Models";
import Settings from "./Settings/Settings";

export const DATASET_GENERAL_TAB_KEY = "general";

const tabs = [
  {
    key: DATASET_GENERAL_TAB_KEY,
    title: "General",
    component: <General />,
  },
  {
    key: "models",
    title: "Models",
    component: <Models />,
  },
  {
    key: "evaluate",
    title: "Evaluate",
    component: <Evaluation />,
  },
  {
    key: "settings",
    title: "Settings",
    component: <Settings />,
  },
];

const DatasetContentTabs = () => <ContentTabs tabs={tabs} headerProps={{ px: 8 }} />;

export default DatasetContentTabs;
