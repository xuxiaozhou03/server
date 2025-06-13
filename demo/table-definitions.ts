import { TableDefinition } from "../tool/type";

export const usersTable: TableDefinition = {
  tableName: "users",
  displayName: "用户信息表",
  comment: "存储所有用户的注册信息和基本信息，支持用户登录、信息管理等功能。",
  fields: [
    {
      name: "id",
      type: "number",
      primary: true,
      autoIncrement: true,
      comment: "用户唯一标识（主键，自增）",
    },
    {
      name: "role",
      type: "UserRole",
      comment: "用户角色",
      enumValues: [
        { value: "parent", comment: "家长" },
        { value: "student", comment: "学生" },
        { value: "tutor", comment: "家教老师" },
      ],
    },
    { name: "name", type: "string", comment: "用户姓名" },
    {
      name: "phone",
      type: "string",
      unique: true,
      comment: "手机号码（唯一）",
    },
    { name: "password", type: "string", comment: "用户密码（加密存储）" },
    {
      name: "email",
      type: "string",
      nullable: true,
      comment: "电子邮箱（可选）",
    },
    { name: "avatar", type: "string", nullable: true, comment: "用户头像路径" },
    { name: "create_time", type: "Date", comment: "注册时间" },
    { name: "last_login", type: "Date", comment: "最后登录时间" },
  ],
};

export const tutorsTable: TableDefinition = {
  tableName: "tutors",
  displayName: "家教老师信息表",
  comment: "存储家教老师的专业信息和教学资料。",
  fields: [
    {
      name: "id",
      type: "number",
      primary: true,
      foreignKey: { table: "users", field: "id", onDelete: "CASCADE" },
      comment: "家教老师唯一标识（外键，关联users表）",
    },
    { name: "subject", type: "string", comment: "擅长科目" },
    { name: "experience", type: "string", comment: "教学经验" },
    {
      name: "rating",
      type: "number",
      default: 0.0,
      comment: "综合评分（平均分）",
    },
    { name: "reviews_count", type: "number", default: 0, comment: "评价数量" },
    { name: "resume", type: "string", comment: "个人简历" },
    { name: "availability", type: "string", comment: "可上课时间" },
  ],
};

export const studentsTable: TableDefinition = {
  tableName: "students",
  displayName: "学生信息表",
  comment: "存储学生的学习需求和相关信息，方便家长管理多个孩子。",
  fields: [
    {
      name: "id",
      type: "number",
      primary: true,
      foreignKey: { table: "users", field: "id", onDelete: "CASCADE" },
      comment: "学生唯一标识（外键，关联users表）",
    },
    {
      name: "parent_id",
      type: "number",
      foreignKey: { table: "users", field: "id", onDelete: "CASCADE" },
      comment: "家长用户ID（外键，关联users表）",
    },
    { name: "grade", type: "string", comment: "年级" },
    { name: "learning_goals", type: "string", comment: "学习目标" },
    { name: "subjects_needed", type: "string", comment: "需要辅导的科目" },
  ],
};

export const appointmentsTable: TableDefinition = {
  tableName: "appointments",
  displayName: "课程预约表",
  comment:
    "记录学生与家教老师之间的课程预约信息，支持预约管理、课程提醒等功能。",
  fields: [
    {
      name: "id",
      type: "number",
      primary: true,
      autoIncrement: true,
      comment: "预约唯一标识（主键，自增）",
    },
    {
      name: "student_id",
      type: "number",
      foreignKey: { table: "students", field: "id", onDelete: "CASCADE" },
      comment: "学生ID（外键，关联students表）",
    },
    {
      name: "tutor_id",
      type: "number",
      foreignKey: { table: "tutors", field: "id", onDelete: "CASCADE" },
      comment: "家教老师ID（外键，关联tutors表）",
    },
    { name: "subject", type: "string", comment: "辅导科目" },
    { name: "start_time", type: "Date", comment: "课程开始时间" },
    { name: "end_time", type: "Date", comment: "课程结束时间" },
    {
      name: "status",
      type: "AppointmentStatus",
      default: "pending",
      comment: "预约状态",
      enumValues: [
        { value: "pending", comment: "待确认" },
        { value: "confirmed", comment: "已确认" },
        { value: "completed", comment: "已完成" },
        { value: "cancelled", comment: "已取消" },
      ],
    },
    { name: "notes", type: "string", comment: "课程备注" },
  ],
};

export const reviewsTable: TableDefinition = {
  tableName: "reviews",
  displayName: "课程评价表",
  comment: "存储学生对家教老师的评价信息，用于生成老师的综合评分和口碑展示。",
  fields: [
    {
      name: "id",
      type: "number",
      primary: true,
      autoIncrement: true,
      comment: "评价唯一标识（主键，自增）",
    },
    {
      name: "appointment_id",
      type: "number",
      foreignKey: { table: "appointments", field: "id", onDelete: "CASCADE" },
      comment: "预约ID（外键，关联appointments表）",
    },
    {
      name: "student_id",
      type: "number",
      foreignKey: { table: "students", field: "id", onDelete: "CASCADE" },
      comment: "学生ID（外键，关联students表）",
    },
    {
      name: "tutor_id",
      type: "number",
      foreignKey: { table: "tutors", field: "id", onDelete: "CASCADE" },
      comment: "家教老师ID（外键，关联tutors表）",
    },
    {
      name: "rating",
      type: "number",
      check: "rating BETWEEN 1 AND 5",
      comment: "评分（1-5分）",
    },
    { name: "comment", type: "string", comment: "评价内容" },
    { name: "create_time", type: "Date", comment: "评价时间" },
  ],
};

export const notificationsTable: TableDefinition = {
  tableName: "notifications",
  displayName: "消息通知表",
  comment: "记录系统向用户发送的各种通知信息，支持消息推送和消息中心功能。",
  fields: [
    {
      name: "id",
      type: "number",
      primary: true,
      autoIncrement: true,
      comment: "通知唯一标识（主键，自增）",
    },
    {
      name: "user_id",
      type: "number",
      foreignKey: { table: "users", field: "id", onDelete: "CASCADE" },
      comment: "接收用户ID（外键，关联users表）",
    },
    { name: "type", type: "string", comment: "通知类型" },
    { name: "content", type: "string", comment: "通知内容" },
    { name: "create_time", type: "Date", comment: "通知生成时间" },
    { name: "is_read", type: "boolean", default: false, comment: "是否已读" },
  ],
};

export const teachingMaterialsTable: TableDefinition = {
  tableName: "teaching_materials",
  displayName: "教学资源表",
  comment: "存储家教老师上传的教学资料，支持学生下载和查看。",
  fields: [
    {
      name: "id",
      type: "number",
      primary: true,
      autoIncrement: true,
      comment: "资源唯一标识（主键，自增）",
    },
    {
      name: "tutor_id",
      type: "number",
      foreignKey: { table: "tutors", field: "id", onDelete: "CASCADE" },
      comment: "上传老师ID（外键，关联tutors表）",
    },
    {
      name: "appointment_id",
      type: "number",
      foreignKey: { table: "appointments", field: "id", onDelete: "CASCADE" },
      comment: "关联预约ID（外键，关联appointments表）",
    },
    { name: "file_path", type: "string", comment: "资源文件路径" },
    { name: "upload_time", type: "Date", comment: "上传时间" },
    { name: "description", type: "string", comment: "资源描述" },
  ],
};

export const assignmentsTable: TableDefinition = {
  tableName: "assignments",
  displayName: "作业表",
  comment: "记录学生上传的作业以及老师的批改反馈，支持作业管理功能。",
  fields: [
    {
      name: "id",
      type: "number",
      primary: true,
      autoIncrement: true,
      comment: "作业唯一标识（主键，自增）",
    },
    {
      name: "student_id",
      type: "number",
      foreignKey: { table: "students", field: "id", onDelete: "CASCADE" },
      comment: "学生ID（外键，关联students表）",
    },
    {
      name: "tutor_id",
      type: "number",
      foreignKey: { table: "tutors", field: "id", onDelete: "CASCADE" },
      comment: "老师ID（外键，关联tutors表）",
    },
    {
      name: "appointment_id",
      type: "number",
      foreignKey: { table: "appointments", field: "id", onDelete: "CASCADE" },
      comment: "关联预约ID（外键，关联appointments表）",
    },
    {
      name: "file_path",
      type: "string",
      nullable: true,
      comment: "作业文件路径",
    },
    { name: "feedback", type: "string", comment: "老师批改反馈" },
    {
      name: "grade",
      type: "number",
      check: "grade BETWEEN 0 AND 100",
      comment: "作业评分",
    },
    { name: "upload_time", type: "Date", comment: "学生上传时间" },
    {
      name: "feedback_time",
      type: "Date",
      nullable: true,
      comment: "老师反馈时间",
    },
  ],
};

export const courseVideosTable: TableDefinition = {
  tableName: "course_videos",
  displayName: "课程录像表",
  comment: "存储课程录像文件路径，支持学生课后回看功能。",
  fields: [
    {
      name: "id",
      type: "number",
      primary: true,
      autoIncrement: true,
      comment: "录像唯一标识（主键，自增）",
    },
    {
      name: "appointment_id",
      type: "number",
      foreignKey: { table: "appointments", field: "id", onDelete: "CASCADE" },
      comment: "关联预约ID（外键，关联appointments表）",
    },
    { name: "video_path", type: "string", comment: "录像文件路径" },
    { name: "upload_time", type: "Date", comment: "录像上传时间" },
  ],
};
