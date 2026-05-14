-- ═══════════════════════════════════════════
-- KPI MERIT SYSTEM: COMPLETE SUPABASE SCHEMA
-- ═══════════════════════════════════════════

-- 0. TEARDOWN (To allow clean re-runs)
-- ═══════════════════════════════════════════
DROP TABLE IF EXISTS public.reward_redemptions CASCADE;
DROP TABLE IF EXISTS public.rewards CASCADE;
DROP TABLE IF EXISTS public.bounties CASCADE;
DROP TABLE IF EXISTS public.skill_modules CASCADE;
DROP TABLE IF EXISTS public.system_configs CASCADE;
DROP TABLE IF EXISTS public.org_config CASCADE;
DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.appeals CASCADE;
DROP TABLE IF EXISTS public.unlocked_achievements CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP TYPE IF EXISTS bounty_status CASCADE;
DROP TYPE IF EXISTS reward_status CASCADE;
DROP TYPE IF EXISTS employment_type CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS appeal_status CASCADE;

-- 1. EXTENSIONS & TYPES
-- ═══════════════════════════════════════════
CREATE TYPE employment_type AS ENUM ('Staff', 'Intern');
CREATE TYPE task_status AS ENUM ('queued', 'running', 'completed');
CREATE TYPE appeal_status AS ENUM ('pending', 'resolved', 'rejected');

-- 2. TABLES
-- ═══════════════════════════════════════════

-- Public Profiles (Custom Auth / Management)
CREATE TABLE public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    manager_uid UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Link to the manager's Supabase UID
    access_id TEXT UNIQUE,
    passcode TEXT,
    full_name TEXT NOT NULL,
    designation TEXT,
    department TEXT,
    role TEXT DEFAULT 'Staff', -- Configurable pre-defined roles
    employment_type employment_type DEFAULT 'Staff',
    ic_number TEXT,
    photo_url TEXT,
    total_points INTEGER DEFAULT 0,
    is_manager BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Definitions (Standard Templates)
CREATE TABLE public.task_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL UNIQUE,
    golden_rule_minutes INTEGER,
    tier_multiplier NUMERIC DEFAULT 1.0, -- Tier 1 = 1.1x, Tier 2 = 1.2x
    is_calibrated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks & Point Awards (Entries)
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  title text NOT NULL,
  note text,
  total_sec integer NOT NULL,
  elapsed_sec integer DEFAULT 0,
  status task_status DEFAULT 'queued',
  tier_name text,
  tier_val numeric,
  points integer DEFAULT 0,
  commencement_date timestamp with time zone,
  actual_duration_minutes integer,
  efficiency_score numeric,
  is_flagged boolean DEFAULT false,
  manager_viewed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Calibration Log (Hidden Table)
CREATE TABLE public.task_calibration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_title TEXT NOT NULL,
    actual_duration_minutes INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for new tables
ALTER TABLE public.task_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view definitions." ON public.task_definitions FOR SELECT USING (true);
CREATE POLICY "Anyone can manage definitions." ON public.task_definitions FOR ALL USING (true);

ALTER TABLE public.task_calibration ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view calibration." ON public.task_calibration FOR SELECT USING (true);
CREATE POLICY "Anyone can manage calibration." ON public.task_calibration FOR ALL USING (true);

-- Activity Log for Ledger
CREATE TABLE public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- achievement, points_earned, system
    "desc" TEXT NOT NULL,
    points INTEGER,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    staff_name TEXT,
    staff_id UUID,
    efficiency_score NUMERIC,
    is_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Org Config Table
CREATE TABLE public.org_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id TEXT UNIQUE DEFAULT 'default',
    config JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievement Mastery List
CREATE TABLE public.achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    icon TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL, -- e.g. 'TASK_COMPLETED'
    task_required TEXT,         -- e.g. 'Daily Content Research'
    trigger_value INTEGER,      -- e.g. 5 (times)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unlocked Achievements (Join Table)
CREATE TABLE public.unlocked_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(staff_id, achievement_id)
);

-- Appeals & Triage
CREATE TABLE public.appeals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
    appeal_comment TEXT NOT NULL,
    original_points INTEGER NOT NULL,
    final_points INTEGER,
    resolution_message TEXT,
    status appeal_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- System Configuration (Global Ledger & Org Settings)
CREATE TABLE public.system_configs (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlocked_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_config ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES (UPDATED FOR CUSTOM AUTH)
-- ═══════════════════════════════════════════
-- NOTE: Since Staff now use an Access ID lookup rather than Supabase Auth JWTs, 
-- auth.uid() will be null for them. For the MVP, we grant open policies for 
-- Staff-accessible tables and rely on the frontend gateway for isolation.

-- PROFILES
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Anyone can update profiles (managed by Frontend Gateway)." ON public.profiles
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can insert profiles." ON public.profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete profiles." ON public.profiles
    FOR DELETE USING (true);

-- TASKS
CREATE POLICY "Anyone can view tasks." ON public.tasks
    FOR SELECT USING (true);

CREATE POLICY "Anyone can manage tasks." ON public.tasks
    FOR ALL USING (true);

-- ACHIEVEMENTS
CREATE POLICY "Everyone can view achievements." ON public.achievements
    FOR SELECT USING (true);

CREATE POLICY "Anyone can manage achievements." ON public.achievements
    FOR ALL USING (true);

-- SYSTEM CONFIGS
CREATE POLICY "Everyone can view configs." ON public.system_configs
    FOR SELECT USING (true);

CREATE POLICY "Anyone can manage configs." ON public.system_configs
    FOR ALL USING (true);

-- ACTIVITY LOG
CREATE POLICY "Everyone can view activity log." ON public.activity_log
    FOR SELECT USING (true);

CREATE POLICY "Anyone can manage activity log." ON public.activity_log
    FOR ALL USING (true);

-- ORG CONFIG
CREATE POLICY "Everyone can view org config." ON public.org_config
    FOR SELECT USING (true);

CREATE POLICY "Anyone can manage org config." ON public.org_config
    FOR ALL USING (true);

-- 5. FUNCTION & TRIGGER: AUTO-PROFILE ON SIGNUP (REMOVED)
-- ═══════════════════════════════════════════
-- Staff profiles are now created specifically via the Management UI.


-- 6. SEED DATA (Achievements & Config & Admin)
-- ═══════════════════════════════════════════

INSERT INTO public.profiles (id, full_name, access_id, passcode, role, is_manager) 
VALUES ('00000000-0000-0000-0000-000000000000', 'ECA Workspace', 'ecaworkspace', '123456', 'Manager', true);

INSERT INTO public.achievements (icon, title, description, trigger_type) VALUES
('star', '30-Day Streak', 'Consistent high-productivity logins sequentially over a 30 day period.', 'LOGIN_SEQ'),
('local_fire_department', 'Top 5% Quarterly', 'Ranking in the top 5% of global lifetime leaderboards at quarter end.', 'END_Q'),
('done_all', 'Module 001 Certified', 'Successful completion and verification of the primary Advanced Architecture skills accelerator.', 'MODULE_DONE');

INSERT INTO public.system_configs (key, value) VALUES
('merit_config', '{
  "basePoints": 10,
  "multiplierRoutine": 1.0,
  "multiplierStandard": 1.2,
  "multiplierComplex": 1.5,
  "multiplierCritical": 2.0
}'),
('org_config', '{
  "workspaceName": "Antigravity Core",
  "defaultDesignation": "Junior Developer",
  "autoAssignments": {
    "Intern-Marketing": {
      "tasks": ["Content Calendar Review", "Social Media Analytics", "Brand Guidelines Sync"]
    },
    "Staff-Engineering": {
      "tasks": ["Code Review", "Daily Scrum", "Infrastructure Check"]
    }
  }
}');

-- 7. THE ECONOMY (BOUNTY & REWARDS)
-- ═══════════════════════════════════════════
CREATE TYPE bounty_status AS ENUM ('open', 'claimed', 'completed');
CREATE TYPE reward_status AS ENUM ('pending', 'fulfilled', 'rejected');

CREATE TABLE public.bounties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    point_reward INTEGER NOT NULL,
    status bounty_status DEFAULT 'open',
    claimed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.skill_modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    merit_value INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.skill_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view modules." ON public.skill_modules FOR SELECT USING (true);
CREATE POLICY "Anyone can manage modules." ON public.skill_modules FOR ALL USING (true);

CREATE TABLE public.rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    point_cost INTEGER NOT NULL,
    icon_type TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.reward_redemptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    reward_id UUID REFERENCES public.rewards(id) ON DELETE CASCADE NOT NULL,
    status reward_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Bounties & Rewards
ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view bounties." ON public.bounties FOR SELECT USING (true);
CREATE POLICY "Anyone can manage bounties." ON public.bounties FOR ALL USING (true);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view rewards." ON public.rewards FOR SELECT USING (true);
CREATE POLICY "Anyone can manage rewards." ON public.rewards FOR ALL USING (true);

ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view redemptions." ON public.reward_redemptions FOR SELECT USING (true);
CREATE POLICY "Anyone can manage redemptions." ON public.reward_redemptions FOR ALL USING (true);

-- POINT REDUCTION FUNCTION (RPC)
CREATE OR REPLACE FUNCTION redeem_reward(p_user_id UUID, p_reward_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_points INTEGER;
    v_reward_cost INTEGER;
BEGIN
    -- Get current points
    SELECT total_points INTO v_user_points FROM public.profiles WHERE id = p_user_id;
    -- Get reward cost
    SELECT point_cost INTO v_reward_cost FROM public.rewards WHERE id = p_reward_id AND is_active = true;

    IF v_reward_cost IS NULL THEN
        RAISE EXCEPTION 'Reward is not active or does not exist';
    END IF;

    IF v_user_points >= v_reward_cost THEN
        -- Deduct points
        UPDATE public.profiles SET total_points = total_points - v_reward_cost WHERE id = p_user_id;
        
        -- Record redemption
        INSERT INTO public.reward_redemptions (user_id, reward_id, status) VALUES (p_user_id, p_reward_id, 'pending');
        
        RETURN true;
    ELSE
        RAISE EXCEPTION 'Insufficient points for this reward';
    END IF;
END;
$$;
