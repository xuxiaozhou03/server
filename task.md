# MySQL 表格字段配置项详解

1. 字段名（Column Name）

   - 字段在表中的名称，必须唯一。

2. 数据类型（Data Type）

   - 指定字段存储的数据类型，如 INT、VARCHAR、TEXT、DATE、DATETIME、FLOAT 等。
   - 示例：`age INT`，`name VARCHAR(50)`

3. 长度/精度（Length/Precision）

   - 某些数据类型需要指定长度或精度，如 VARCHAR(255)、DECIMAL(10,2)。
   - 示例：`price DECIMAL(10,2)`

4. 是否允许为 NULL（NULL/NOT NULL）

   - 指定该字段是否可以存储 NULL 值。
   - 示例：`email VARCHAR(100) NOT NULL`

5. 默认值（DEFAULT）

   - 字段的默认值。
   - 示例：`status INT DEFAULT 0`

6. 主键（PRIMARY KEY）

   - 标记该字段为主键，唯一且不为空。
   - 示例：`id INT PRIMARY KEY`

7. 唯一约束（UNIQUE）

   - 字段值必须唯一。
   - 示例：`username VARCHAR(50) UNIQUE`

8. 自动递增（AUTO_INCREMENT）

   - 数值类型字段自增，常用于主键。
   - 示例：`id INT AUTO_INCREMENT`

9. 注释（COMMENT）

   - 字段的说明信息。
   - 示例：`age INT COMMENT '用户年龄'`

10. 外键约束（FOREIGN KEY）

    - 关联其他表的字段。
    - 示例：`user_id INT, FOREIGN KEY (user_id) REFERENCES users(id)`

11. 索引（INDEX/KEY）

    - 提高查询效率。
    - 示例：`INDEX idx_name (name)`

12. 字符集（CHARACTER SET）和排序规则（COLLATE）

    - 指定字符串字段的字符集和排序规则。
    - 示例：`name VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`

13. ZEROFILL、UNSIGNED（针对数值类型）
    - ZEROFILL：自动补零。
    - UNSIGNED：无符号，只能存储正数。
    - 示例：`score INT UNSIGNED ZEROFILL`
