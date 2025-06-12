// mysql 数据表字段有哪些配置项

export interface TableField {
  field: string; // 字段名（数据库实际字段名）
  type:
    | "char"
    | "varchar"
    | "int"
    | "float"
    | "double"
    | "decimal"
    | "date"
    | "datetime"
    | "timestamp"
    | "boolean"
    | "text"
    | "blob"
    | "json"
    | "enum"
    | "set";
  length?: number; // 字段长度（如 varchar(255)）
  nullable: boolean; // 是否允许为 NULL
  default?: any; // 默认值
  autoIncrement?: boolean; // 是否自增
  primaryKey?: boolean; // 是否主键
  unique?: boolean; // 是否唯一
  comment?: string; // 字段注释
  unsigned?: boolean; // 是否无符号（数值类型）
  onUpdateCurrentTimestamp?: boolean; // 是否 on update CURRENT_TIMESTAMP
  // 关联表相关配置
  foreignKey?: {
    referencedTable: string; // 关联的表名
    referencedColumn: string; // 关联表的字段名
  };
  // 验证字段
  enumOptions?: Array<{ label: string; value: string | number }>; // 枚举类型的可选值，仅当 type 为 "enum" 时使用
  // 对数据进行验证
  validation?: {
    required?: boolean; // 是否必填
    minLength?: number; // 最小长度
    maxLength?: number; // 最大长度
    pattern?: string; // 正则表达式
  };
}
export interface Table {
  name: string;
  description: string;
  fields: TableField[];
}
