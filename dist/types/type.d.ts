export interface TableField {
    field: string;
    type: "char" | "varchar" | "int" | "float" | "double" | "decimal" | "date" | "datetime" | "timestamp" | "boolean" | "text" | "blob" | "json" | "enum" | "set";
    length?: number;
    nullable: boolean;
    default?: any;
    autoIncrement?: boolean;
    primaryKey?: boolean;
    unique?: boolean;
    comment?: string;
    unsigned?: boolean;
    onUpdateCurrentTimestamp?: boolean;
    foreignKey?: {
        referencedTable: string;
        referencedColumn: string;
    };
    enumOptions?: Array<{
        label: string;
        value: string | number;
    }>;
    validation?: {
        required?: boolean;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
    };
}
export interface Table {
    name: string;
    description: string;
    fields: TableField[];
}
