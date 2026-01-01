import { FieldType } from "@airtable/blocks/interface/models";
import type { Base, FieldConfig } from "@airtable/blocks/interface/models";

export function getCustomProperties(base: Base) {
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
      key: "title",
      label: "Chart Title",
      type: "string" as const,
      defaultValue: "Company revenue map",
    },
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
