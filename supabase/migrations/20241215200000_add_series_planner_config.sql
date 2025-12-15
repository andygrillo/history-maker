-- Add planner configuration columns to series table
ALTER TABLE series
ADD COLUMN IF NOT EXISTS weekly_goal INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS time_horizon TEXT DEFAULT '1_week',
ADD COLUMN IF NOT EXISTS platforms TEXT[] DEFAULT ARRAY['youtube', 'youtube_short'];

-- Add check constraint for time_horizon
ALTER TABLE series
ADD CONSTRAINT series_time_horizon_check
CHECK (time_horizon IN ('1_week', '1_month', '3_months'));

-- Add check constraint for weekly_goal
ALTER TABLE series
ADD CONSTRAINT series_weekly_goal_check
CHECK (weekly_goal >= 1 AND weekly_goal <= 7);
