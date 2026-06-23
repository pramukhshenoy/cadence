# Data Model

Prisma schema for SQLite. All models live in `server/prisma/schema.prisma`.

## Timezone contract
All `DateTime` fields are stored UTC. Every request that involves local-time reasoning (calendar sync, sleep read, habit completion, scheduling) must include the device's IANA timezone string (e.g., `"Asia/Kolkata"`). The backend performs all "local day" math in that timezone. Habit completions use a `String` date (`YYYY-MM-DD` in local time) rather than `DateTime` to avoid UTC boundary issues with streak logic.

## Settings singleton
The `Settings` row (id = `"singleton"`) is seeded in the Prisma migration. All reads upsert the row if it does not exist.

```prisma
model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  priority    Priority
  dueDate     DateTime?
  status      TaskStatus @default(TODO)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model Habit {
  id               String            @id @default(cuid())
  name             String
  description      String?
  frequency        Frequency
  weeklyTargetDays String?           // JSON array of day ints (0=Sun) for WEEKLY habits
  completions      HabitCompletion[]
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
}

model HabitCompletion {
  id        String @id @default(cuid())
  habitId   String
  habit     Habit  @relation(fields: [habitId], references: [id], onDelete: Cascade)
  localDate String // "YYYY-MM-DD" in device local time — timezone-stable for streak logic
}

model FocusBlock {
  id                    String          @id @default(cuid())
  deviceCalendarEventId String          @unique // expo-calendar event ID; unique to prevent duplicates
  calendarMarker        String          @unique // app-generated UUID stored in event notes for reliable identification
  startTime             DateTime
  endTime               DateTime
  taskId                String?
  status                FocusBlockStatus @default(ACTIVE)
  rescheduled           Boolean         @default(false)
  rescheduleReason      String?         // e.g. "poor sleep (5.2h)"
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt
}

model SleepRecord {
  id             String       @id @default(cuid())
  localDate      String       @unique // "YYYY-MM-DD" of the night — unique per night
  durationHours  Float
  quality        SleepQuality // derived: Poor < sleepThresholdHours, Good ≥ goodThresholdHours, Fair in between
  deepSleepHours Float?
  remSleepHours  Float?
  sessionCount   Int          @default(1) // number of sleep sessions aggregated
  fetchedAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}

model ChatMessage {
  id             String   @id @default(cuid())
  conversationId String   // group messages into sessions; start new chat = new conversationId
  role           Role
  content        String
  createdAt      DateTime @default(now())
}

// Known limitation: no Conversation model yet. conversationId is a plain string.
// A future Conversation model can be added in Phase 6 polish without migration pain.

model Settings {
  id                  String  @id @default("singleton")
  focusHoursPerWeek   Int     @default(10)
  workdayStartHour    Int     @default(9)
  workdayEndHour      Int     @default(18)
  includeWeekends     Boolean @default(false)
  preferredModel      String  @default("claude-sonnet-4-6") // verify ID against Anthropic model list before use
  sleepThresholdHours Float   @default(6.5)  // Poor: total < this
  goodThresholdHours  Float   @default(7.0)  // Good: total >= this; Fair: between the two
  morningCutoffHour   Int     @default(10)   // focus blocks before this hour are "morning" and may be rescheduled
  targetCalendarId    String? // expo-calendar calendarId selected during onboarding
  timezone            String  @default("UTC") // device IANA timezone, set on first launch
  updatedAt           DateTime @updatedAt
}

enum Priority        { LOW MEDIUM HIGH }
enum TaskStatus      { TODO IN_PROGRESS DONE }
enum Frequency       { DAILY WEEKLY }
enum FocusBlockStatus { ACTIVE DELETED }
enum SleepQuality    { POOR FAIR GOOD }
enum Role            { USER ASSISTANT }
```
