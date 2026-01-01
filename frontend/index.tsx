import { initializeBlock } from "@airtable/blocks/interface/ui";
import { TreemapChart } from "./components/TreemapChart";
import "./style.css";

initializeBlock({ interface: () => <TreemapChart /> });
