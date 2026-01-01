import {
  initializeBlock,
  useBase,
  useRecords,
  useCustomProperties,
  useColorScheme,
  colorUtils,
} from "@airtable/blocks/interface/ui";
import { FieldType } from "@airtable/blocks/interface/models";
import type {
  Base,
  Table,
  Field,
  FieldConfig,
} from "@airtable/blocks/interface/models";
import { ResponsiveTreeMap } from "@nivo/treemap";
import { useMemo } from "react";
import "./style.css";

interface TreemapNode {
  id: string;
  name: string;
  value?: number;
  color?: string;
  children?: TreemapNode[];
}

function getCustomProperties(base: Base) {
  const table = base.tables[0];

  const isTextField = (field: { id: string; config: FieldConfig }) =>
    field.config.type === FieldType.SINGLE_LINE_TEXT ||
    field.config.type === FieldType.FORMULA ||
    field.config.type === FieldType.SINGLE_SELECT;

  const isNumberField = (field: { id: string; config: FieldConfig }) =>
    field.config.type === FieldType.NUMBER ||
    field.config.type === FieldType.CURRENCY ||
    field.config.type === FieldType.PERCENT ||
    field.config.type === FieldType.COUNT ||
    field.config.type === FieldType.ROLLUP ||
    field.config.type === FieldType.FORMULA;

  const isCategoryField = (field: { id: string; config: FieldConfig }) =>
    field.config.type === FieldType.SINGLE_SELECT ||
    field.config.type === FieldType.SINGLE_LINE_TEXT;

  const textFields = table.fields.filter(isTextField);
  const numberFields = table.fields.filter(isNumberField);
  const categoryFields = table.fields.filter(isCategoryField);

  return [
    {
      key: "labelField",
      label: "Label Field",
      type: "field" as const,
      table,
      shouldFieldBeAllowed: isTextField,
      defaultValue: textFields[0],
    },
    {
      key: "valueField",
      label: "Value Field (Size)",
      type: "field" as const,
      table,
      shouldFieldBeAllowed: isNumberField,
      defaultValue: numberFields[0],
    },
    {
      key: "groupByField",
      label: "Group By Field (Optional)",
      type: "field" as const,
      table,
      shouldFieldBeAllowed: isCategoryField,
      defaultValue: categoryFields[0],
    },
  ];
}

function TreemapChart() {
  const base = useBase();
  const table = base.tables[0];
  const records = useRecords(table);
  const colorScheme = useColorScheme();
  const isDark = colorScheme.colorScheme === "dark";

  const { customPropertyValueByKey, errorState } =
    useCustomProperties(getCustomProperties);

  const labelField = customPropertyValueByKey.labelField as Field | undefined;
  const valueField = customPropertyValueByKey.valueField as Field | undefined;
  const groupByField = customPropertyValueByKey.groupByField as
    | Field
    | undefined;

  const treemapData = useMemo<TreemapNode>(() => {
    if (!labelField || !valueField || !records.length) {
      return { id: "root", name: "root", children: [] };
    }

    if (groupByField) {
      const groups: Record<string, TreemapNode[]> = {};

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
          groups[groupName] = [];
        }

        groups[groupName].push({
          id: record.id,
          name: label,
          value: Math.max(value, 0),
          color: groupColor,
        });
      });

      const children: TreemapNode[] = Object.entries(groups).map(
        ([name, items]) => ({
          id: name,
          name,
          color: items[0]?.color,
          children: items,
        })
      );

      return { id: "root", name: "root", children };
    }

    const children: TreemapNode[] = records.map((record) => {
      const label = record.getCellValueAsString(labelField) || "Unnamed";
      const rawValue = record.getCellValue(valueField);
      const value = typeof rawValue === "number" ? rawValue : 0;

      return {
        id: record.id,
        name: label,
        value: Math.max(value, 0),
      };
    });

    return { id: "root", name: "root", children };
  }, [records, labelField, valueField, groupByField]);

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
          label={(node) => node.data.name}
          labelSkipSize={12}
          labelTextColor={{
            from: "color",
            modifiers: [["darker", isDark ? -3 : 3]],
          }}
          parentLabelPosition="left"
          parentLabelTextColor={{
            from: "color",
            modifiers: [["darker", isDark ? -2 : 2]],
          }}
          borderColor={{
            from: "color",
            modifiers: [["darker", 0.3]],
          }}
          colors={{ scheme: "nivo" }}
          nodeOpacity={1}
          borderWidth={2}
          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          theme={{
            text: {
              fill: isDark ? "#e5e7eb" : "#374151",
            },
            tooltip: {
              container: {
                background: isDark ? "#374151" : "#ffffff",
                color: isDark ? "#e5e7eb" : "#374151",
              },
            },
          }}
        />
      </div>
    </div>
  );
}

initializeBlock({ interface: () => <TreemapChart /> });
