-- 查询所有（含链表）
SELECT t.`id`, t.`user_id`, t.`address`, users.`id` AS users__id, users.`name` AS users__name, users.`sex` AS users__sex FROM `user_details` AS t LEFT JOIN `users` AS users ON t.`user_id` = users.`id`;

-- 查询单个（含链表）
SELECT t.`id`, t.`user_id`, t.`address`, users.`id` AS users__id, users.`name` AS users__name, users.`sex` AS users__sex FROM `user_details` AS t LEFT JOIN `users` AS users ON t.`user_id` = users.`id` WHERE t.`id` = ?;

-- 新增
INSERT INTO `user_details` (`id`, `user_id`, `address`) VALUES (?, ?, ?);

-- 更新
UPDATE `user_details` SET `user_id` = ?, `address` = ? WHERE `id` = ?;

-- 删除
DELETE FROM `user_details` WHERE `id` = ?;