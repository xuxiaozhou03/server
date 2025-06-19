// MySQL 字段配置项 TypeScript 定义
interface BaseColumn {
  /** 字段名 */
  name: string;
  /** 是否允许为 NULL，默认 true */
  nullable?: boolean;
  /** 是否唯一 */
  unique?: boolean;
  /** 字段注释 */
  comment?: string;
  /** 外键约束，引用表和字段，可选 */
  foreignKey?: {
    table: string;
    field: string;
  };
  /** 是否有索引 */
  index?: boolean;
  /** 字符集，可选 */
  characterSet?: string;
  /** 排序规则，可选 */
  collate?: string;
}

// ENUM 类型字段定义
export interface EnumColumn extends BaseColumn {
  dataType: "ENUM";
  enumValues: Array<{
    value: any; // 枚举值，可以是字符串或数字
    comment: string; // 枚举值的注释
  }>;
}

// 主键字段定义
export interface PrimaryKeyColumn extends BaseColumn {
  primaryKey: true;
  dataType: "INT"; // 主键通常为整数类型
  autoIncrement: true; // 主键通常是自增的
  nullable?: false; // 主键不允许为 NULL
}

// 字符串类型字段定义
export interface VarcharColumn extends BaseColumn {
  dataType: "VARCHAR";
  length?: number;
}
export interface TextColumn extends BaseColumn {
  dataType: "TEXT";
}

// 数字类型字段定义
export interface NumberColumn extends BaseColumn {
  dataType: "INT" | "FLOAT";
  length?: number; // INT 或 FLOAT 的长度
  defaultValue?: number;
  autoIncrement?: boolean;
  /** 是否无符号（仅数值类型） */
  unsigned?: boolean;
  /** 是否自动补零（仅数值类型） */
  zerofill?: boolean;
  /** 精度 */
  precision?: number; // FLOAT 的精度
}
export interface DECIMALColumn extends BaseColumn {
  dataType: "DECIMAL";
  length?: string; // DECIMAL 可能用 "10,2" 形式
  /** 默认值 */
  defaultValue?: number;
  autoIncrement?: boolean;
  /** 是否无符号（仅数值类型） */
  unsigned?: boolean;
  /** 是否自动补零（仅数值类型） */
  zerofill?: boolean;
  /** 精度 */
  precision?: number; // DECIMAL 的精度
}

// DATETIME 类型字段定义
export interface DATETIMEColumn extends BaseColumn {
  dataType: "DATETIME";
  defaultValue?: string; // 可选，默认值如 CURRENT_TIMESTAMP
}

// 通用字段类型
export type Column =
  | EnumColumn
  | PrimaryKeyColumn
  | VarcharColumn
  | TextColumn
  | NumberColumn
  | DECIMALColumn
  | DATETIMEColumn;

export type Table = {
  /** 表名 */
  name: string;
  /** 表注释 */
  comment?: string;
  /** 字段列表 */
  columns: Column[];
};
