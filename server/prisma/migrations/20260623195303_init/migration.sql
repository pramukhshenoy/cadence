-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "frequency" TEXT NOT NULL,
    "weeklyTargetDays" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HabitCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "habitId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    CONSTRAINT "HabitCompletion_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FocusBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceCalendarEventId" TEXT NOT NULL,
    "calendarMarker" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "taskId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "rescheduled" BOOLEAN NOT NULL DEFAULT false,
    "rescheduleReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SleepRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "localDate" TEXT NOT NULL,
    "durationHours" REAL NOT NULL,
    "quality" TEXT NOT NULL,
    "deepSleepHours" REAL,
    "remSleepHours" REAL,
    "sessionCount" INTEGER NOT NULL DEFAULT 1,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "focusHoursPerWeek" INTEGER NOT NULL DEFAULT 10,
    "workdayStartHour" INTEGER NOT NULL DEFAULT 9,
    "workdayEndHour" INTEGER NOT NULL DEFAULT 18,
    "includeWeekends" BOOLEAN NOT NULL DEFAULT false,
    "preferredModel" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "sleepThresholdHours" REAL NOT NULL DEFAULT 6.5,
    "goodThresholdHours" REAL NOT NULL DEFAULT 7.0,
    "morningCutoffHour" INTEGER NOT NULL DEFAULT 10,
    "targetCalendarId" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "HabitCompletion_habitId_localDate_key" ON "HabitCompletion"("habitId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "FocusBlock_deviceCalendarEventId_key" ON "FocusBlock"("deviceCalendarEventId");

-- CreateIndex
CREATE UNIQUE INDEX "FocusBlock_calendarMarker_key" ON "FocusBlock"("calendarMarker");

-- CreateIndex
CREATE UNIQUE INDEX "SleepRecord_localDate_key" ON "SleepRecord"("localDate");

-- SeedSettings
INSERT OR IGNORE INTO "Settings" ("id", "updatedAt") VALUES ('singleton', CURRENT_TIMESTAMP);
