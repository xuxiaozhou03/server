import { Table } from "./type";
/**
 * 生成 CURD SQL 语句，支持链表（外键）操作
 * @param table 当前表结构
 * @param allTables 所有表结构
 */
export declare function genCurdSql(table: Table, allTables: Table[]): string;
