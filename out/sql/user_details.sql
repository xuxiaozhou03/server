CREATE TABLE IF NOT EXISTS `user_details` (
  `id` INT NOT NULL COMMENT '用户详情ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `address` VARCHAR COMMENT '地址',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);