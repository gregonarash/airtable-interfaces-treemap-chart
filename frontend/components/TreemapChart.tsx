import {
  useBase,
  useRecords,
  useCustomProperties,
  useColorScheme,
  colorUtils,
} from "@airtable/blocks/interface/ui";
import type { Field } from "@airtable/blocks/interface/models";
import { ResponsiveTreeMap } from "@nivo/treemap";
import { useMemo } from "react";
import { getCustomProperties } from "../customProperties";

interface TreemapNode {
  id: string;
  value?: number;
  color?: string;
  children?: TreemapNode[];
}

export function TreemapChart() {
  const base = useBase();
  const table = base.tables[0];
  const records = useRecords(table);
  const colorScheme = useColorScheme();
  const isDark = colorScheme.colorScheme === "dark";

  const { customPropertyValueByKey, errorState } =
    useCustomProperties(getCustomProperties);

  const title =
    (customPropertyValueByKey.title as string) || "Company revenue map";
  const labelField = customPropertyValueByKey.labelField as Field | undefined;
  const valueField = customPropertyValueByKey.valueField as Field | undefined;
  const groupByField = customPropertyValueByKey.groupByField as
    | Field
    | undefined;

  const treemapData = useMemo<TreemapNode>(() => {
    if (!labelField || !valueField || !records.length) {
      return { id: title, children: [] };
    }

    if (groupByField) {
      const groups: Record<
        string,
        Record<string, { value: number; color?: string }>
      > = {};

      records.forEach((record) => {
        const label = record.getCellValueAsString(labelField) || "Unnamed";
        const rawValue = record.getCellValue(valueField);
        const value = typeof rawValue === "number" ? rawValue : 0;
        const groupValue = record.getCellValue(groupByField);

        let groupName = "Ungrouped";
        let groupColor: string | undefined;

        if (
          groupValue &&
          typeof groupValue === "object" &&
          "name" in groupValue
        ) {
          groupName = (groupValue as { name: string }).name;
          if (
            "color" in groupValue &&
            (groupValue as { color?: string }).color
          ) {
            groupColor =
              colorUtils.getHexForColor(
                (groupValue as { color: string }).color
              ) ?? undefined;
          }
        } else if (typeof groupValue === "string") {
          groupName = groupValue;
        }

        if (!groups[groupName]) {
          groups[groupName] = {};
        }

        if (!groups[groupName][label]) {
          groups[groupName][label] = { value: 0, color: groupColor };
        }
        groups[groupName][label].value += Math.max(value, 0);
      });

      const children: TreemapNode[] = Object.entries(groups).map(
        ([name, items]) => {
          const itemChildren: TreemapNode[] = Object.entries(items).map(
            ([itemLabel, data]) => ({
              id: itemLabel,
              value: data.value,
              color: data.color,
            })
          );
          return {
            id: name,
            color: itemChildren[0]?.color,
            children: itemChildren,
          };
        }
      );

      return { id: title, children };
    }

    const aggregated: Record<string, number> = {};
    records.forEach((record) => {
      const label = record.getCellValueAsString(labelField) || "Unnamed";
      const rawValue = record.getCellValue(valueField);
      const value = typeof rawValue === "number" ? rawValue : 0;

      if (!aggregated[label]) {
        aggregated[label] = 0;
      }
      aggregated[label] += Math.max(value, 0);
    });

    const children: TreemapNode[] = Object.entries(aggregated).map(
      ([label, value]) => ({
        id: label,
        value,
      })
    );

    return { id: title, children };
  }, [records, labelField, valueField, groupByField, title]);

  if (errorState) {
    return (
      <div className="p-4 min-h-screen bg-gray-gray50 dark:bg-gray-gray800">
        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 rounded-lg">
          Error loading custom properties: {errorState.error.message}
        </div>
      </div>
    );
  }

  if (!labelField || !valueField) {
    return (
      <div className="p-4 min-h-screen bg-gray-gray50 dark:bg-gray-gray800">
        <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 p-4 rounded-lg">
          <h2 className="font-bold mb-2">Configuration Required</h2>
          <p>
            Please configure the following custom properties in the properties
            panel:
          </p>
          <ul className="list-disc list-inside mt-2">
            {!labelField && (
              <li>Label Field - The field to use for item labels</li>
            )}
            {!valueField && (
              <li>Value Field - The numeric field to determine item sizes</li>
            )}
          </ul>
        </div>
      </div>
    );
  }

  if (!records.length) {
    return (
      <div className="p-4 min-h-screen bg-gray-gray50 dark:bg-gray-gray800">
        <div className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 p-4 rounded-lg">
          No records found in the table.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 min-h-screen bg-gray-gray50 dark:bg-gray-gray800">
      <div className="h-[600px] w-full bg-white dark:bg-gray-gray700 rounded-lg shadow-lg p-4">
        <ResponsiveTreeMap
          data={treemapData}
          identity="id"
          value="value"
          valueFormat=" >-.4r"
          label={(node) => {
            return `${
              node.data.id.length > 10
                ? node.data.id.slice(0, 10) + "..."
                : node.data.id
            }
            
            \n(${node.data.value})`;
          }}
          labelSkipSize={50}
          labelTextColor={{
            from: "color",
            modifiers: [["darker", isDark ? -3 : 3]],
          }}
          parentLabelPosition="top"
          parentLabelPadding={20}
          parentLabelSize={25}
          parentLabel={(node) => `${node.id} (${node.formattedValue})`}
          parentLabelTextColor={{
            from: "color",
            modifiers: [["darker", isDark ? -3 : 3]],
          }}
          borderColor={{
            from: "color",
            modifiers: [["darker", 0.3]],
          }}
          colors={{ scheme: "nivo" }}
          nodeOpacity={0.5}
          borderWidth={2}
          //margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          //   theme={{
          //     text: {
          //       fill: isDark ? "#e5e7eb" : "#374151",
          //     },
          //     tooltip: {
          //       container: {
          //         background: isDark ? "#374151" : "#ffffff",
          //         color: isDark ? "#e5e7eb" : "#374151",
          //       },
          //     },
          //   }}
        />
      </div>
    </div>
  );
}
