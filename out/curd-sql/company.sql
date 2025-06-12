-- 查询所有（含链表）
SELECT t.`id`, t.`name` FROM `company` AS t;

-- 查询单个（含链表）
SELECT t.`id`, t.`name` FROM `company` AS t WHERE t.`id` = ?;

-- 新增
INSERT INTO `company` (`id`, `name`) VALUES (?, ?);

-- 更新
UPDATE `company` SET `name` = ? WHERE `id` = ?;

-- 删除
DELETE FROM `company` WHERE `id` = ?;