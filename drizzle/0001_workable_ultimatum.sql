CREATE TABLE `olympiad_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionToken` varchar(64) NOT NULL,
	`currentRound` int NOT NULL DEFAULT 1,
	`currentPhase` enum('selection','question','completed') NOT NULL DEFAULT 'selection',
	`selectedDifficulty` enum('mudah','sedang','sulit'),
	`totalScore` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `olympiad_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `olympiad_sessions_sessionToken_unique` UNIQUE(`sessionToken`)
);
--> statement-breakpoint
CREATE TABLE `round_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`round` int NOT NULL,
	`difficulty` enum('mudah','sedang','sulit') NOT NULL,
	`score` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `round_scores_id` PRIMARY KEY(`id`)
);
