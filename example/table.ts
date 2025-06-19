import { Table } from "../cli/type";

// 家教小程序核心数据表结构定义
export const userTable: Table = {
  name: "user",
  comment: "用户表，包含家长、学生、老师",
  columns: [
    {
      name: "id",
      dataType: "INT",
      primaryKey: true,
      autoIncrement: true,
      nullable: false,
      comment: "主键",
    },
    {
      name: "role",
      dataType: "ENUM",
      enumValues: [
        { value: "parent", comment: "家长" },
        { value: "student", comment: "学生" },
        { value: "teacher", comment: "老师" },
      ],
      comment: "用户角色",
    },
    {
      name: "username",
      dataType: "VARCHAR",
      length: 50,
      unique: true,
      comment: "用户名",
    },
    { name: "password", dataType: "VARCHAR", length: 100, comment: "密码" },
    { name: "real_name", dataType: "VARCHAR", length: 50, comment: "真实姓名" },
    {
      name: "phone",
      dataType: "VARCHAR",
      length: 20,
      unique: true,
      comment: "手机号",
    },
    { name: "avatar", dataType: "VARCHAR", length: 255, comment: "头像" },
    {
      name: "id_verified",
      dataType: "ENUM",
      enumValues: [
        { value: "pending", comment: "待审核" },
        { value: "approved", comment: "已通过" },
        { value: "rejected", comment: "未通过" },
      ],
      comment: "实名认证状态",
    },
    { name: "created_at", dataType: "DATETIME", comment: "注册时间" },
    { name: "updated_at", dataType: "DATETIME", comment: "更新时间" },
  ],
};

export const demandTable: Table = {
  name: "demand",
  comment: "家教需求表",
  columns: [
    {
      name: "id",
      dataType: "INT",
      primaryKey: true,
      autoIncrement: true,
      nullable: false,
      comment: "主键",
    },
    {
      name: "user_id",
      dataType: "INT",
      comment: "发布用户ID",
      foreignKey: { table: "user", field: "id" },
    },
    { name: "subject", dataType: "VARCHAR", length: 50, comment: "科目" },
    { name: "desc", dataType: "TEXT", comment: "需求描述" },
    { name: "address", dataType: "VARCHAR", length: 255, comment: "上课地址" },
    { name: "budget", dataType: "DECIMAL", length: "10,2", comment: "预算" },
    {
      name: "status",
      dataType: "ENUM",
      enumValues: [
        { value: "open", comment: "待应聘" },
        { value: "matched", comment: "已匹配" },
        { value: "closed", comment: "已关闭" },
      ],
      comment: "需求状态",
    },
    { name: "created_at", dataType: "DATETIME", comment: "发布时间" },
    { name: "updated_at", dataType: "DATETIME", comment: "更新时间" },
  ],
};

export const orderTable: Table = {
  name: "order",
  comment: "家教订单表",
  columns: [
    {
      name: "id",
      dataType: "INT",
      primaryKey: true,
      autoIncrement: true,
      nullable: false,
      comment: "主键",
    },
    {
      name: "demand_id",
      dataType: "INT",
      comment: "需求ID",
      foreignKey: { table: "demand", field: "id" },
    },
    {
      name: "teacher_id",
      dataType: "INT",
      comment: "老师ID",
      foreignKey: { table: "user", field: "id" },
    },
    {
      name: "status",
      dataType: "ENUM",
      enumValues: [
        { value: "pending", comment: "待确认" },
        { value: "in_progress", comment: "进行中" },
        { value: "completed", comment: "已完成" },
        { value: "cancelled", comment: "已取消" },
      ],
      comment: "订单状态",
    },
    { name: "price", dataType: "DECIMAL", length: "10,2", comment: "订单金额" },
    { name: "created_at", dataType: "DATETIME", comment: "下单时间" },
    { name: "updated_at", dataType: "DATETIME", comment: "更新时间" },
  ],
};

export const reviewTable: Table = {
  name: "review",
  comment: "评价表",
  columns: [
    {
      name: "id",
      dataType: "INT",
      primaryKey: true,
      autoIncrement: true,
      nullable: false,
      comment: "主键",
    },
    {
      name: "order_id",
      dataType: "INT",
      comment: "订单ID",
      foreignKey: { table: "order", field: "id" },
    },
    {
      name: "user_id",
      dataType: "INT",
      comment: "评价用户ID",
      foreignKey: { table: "user", field: "id" },
    },
    { name: "score", dataType: "INT", comment: "评分" },
    { name: "content", dataType: "TEXT", comment: "评价内容" },
    { name: "created_at", dataType: "DATETIME", comment: "评价时间" },
  ],
};

export const messageTable: Table = {
  name: "message",
  comment: "消息通知表",
  columns: [
    {
      name: "id",
      dataType: "INT",
      primaryKey: true,
      autoIncrement: true,
      nullable: false,
      comment: "主键",
    },
    {
      name: "user_id",
      dataType: "INT",
      comment: "接收用户ID",
      foreignKey: { table: "user", field: "id" },
    },
    {
      name: "type",
      dataType: "ENUM",
      enumValues: [
        { value: "order", comment: "订单消息" },
        { value: "system", comment: "系统消息" },
        { value: "chat", comment: "沟通消息" },
      ],
      comment: "消息类型",
    },
    { name: "content", dataType: "TEXT", comment: "消息内容" },
    {
      name: "is_read",
      dataType: "ENUM",
      enumValues: [
        { value: "yes", comment: "已读" },
        { value: "no", comment: "未读" },
      ],
      comment: "是否已读",
    },
    { name: "created_at", dataType: "DATETIME", comment: "发送时间" },
  ],
};
