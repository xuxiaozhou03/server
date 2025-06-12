import { Table } from "../type";

export const companyTables: Table = {
  name: "company",
  description: "",
  fields: [
    {
      field: "id",
      type: "int",
      comment: "公司ID",
      nullable: false,
    },
    {
      field: "name",
      type: "varchar",
      comment: "公司名",
      nullable: false,
    },
  ],
};
