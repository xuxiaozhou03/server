-- 查询所有（含链表）
SELECT t.`id`, t.`name`, t.`sex` FROM `users` AS t;

-- 查询单个（含链表）
SELECT t.`id`, t.`name`, t.`sex` FROM `users` AS t WHERE t.`id` = ?;

-- 新增
INSERT INTO `users` (`id`, `name`, `sex`) VALUES (?, ?, ?);

-- 更新
UPDATE `users` SET `name` = ?, `sex` = ? WHERE `id` = ?;

-- 删除
DELETE FROM `users` WHERE `id` = ?;