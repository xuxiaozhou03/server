// 字段定义
export interface FieldDefinition {
  name: string; // 字段名
  type: string; // 字段类型（如 string, number, Date, 枚举名等）
  length?: number; // 字段长度（如 VARCHAR(50)）
  primary?: boolean; // 是否主键
  autoIncrement?: boolean; // 是否自增
  unique?: boolean; // 是否唯一
  nullable?: boolean; // 是否可空
  default?: any; // 默认值
  enumValues?: Array<{ comment: string; value: string }>; // 枚举可选值（如有枚举），含注释
  foreignKey?: {
    table: string; // 关联表
    field: string; // 关联字段
    onDelete?: string; // 级联删除等
    onUpdate?: string; // 级联更新等
  };
  check?: string; // 检查约束表达式
  comment?: string; // 字段备注
}

// 表定义
export interface TableDefinition {
  tableName: string; // 表名
  displayName: string; // 表中文名
  comment?: string; // 表备注
  fields: FieldDefinition[]; // 字段列表
}
