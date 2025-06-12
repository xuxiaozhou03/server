import { Table } from "../type";

export const userTables: Table = {
  name: "users",
  description: "",
  fields: [
    {
      field: "id",
      type: "int",
      comment: "用户ID",
      nullable: false,
    },
    {
      field: "name",
      type: "varchar",
      comment: "用户名",
      nullable: false,
    },
    {
      field: "sex",
      type: "varchar",
      comment: "性别",
      nullable: true,
    },
  ],
};

// 用户详情表
export const userDetailTables: Table = {
  name: "user_details",
  description: "用户详情表",
  fields: [
    {
      field: "id",
      type: "int",
      comment: "用户详情ID",
      nullable: false,
    },
    {
      field: "user_id",
      type: "int",
      comment: "用户ID",
      nullable: false,
      foreignKey: {
        referencedTable: "users",
        referencedColumn: "id",
      },
    },
    {
      field: "address",
      type: "varchar",
      comment: "地址",
      nullable: true,
    },
  ],
};
