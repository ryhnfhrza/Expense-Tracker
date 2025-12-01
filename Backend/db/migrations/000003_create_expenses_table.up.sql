CREATE TABLE `expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `description` text,
  `amount` decimal(12,2) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  KEY `idx_user_created_at` (`user_id`,`created_at`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  CONSTRAINT `expenses_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=133 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci