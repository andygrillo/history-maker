-- gen_random_uuid() is available by default in Supabase

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings table (stores encrypted API keys)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  r2_endpoint TEXT,
  r2_bucket_name TEXT,
  r2_access_key TEXT,
  r2_secret_key TEXT,
  r2_public_url TEXT,
  aws_bedrock_api_key TEXT,
  elevenlabs_api_key TEXT,
  google_gemini_api_key TEXT,
  artlist_api_key TEXT,
  -- Custom prompt templates (null means use default)
  prompt_planner_system TEXT,
  prompt_planner_user TEXT,
  prompt_script_system TEXT,
  prompt_script_user TEXT,
  prompt_audio_tagging_system TEXT,
  prompt_audio_tagging_user TEXT,
  prompt_visual_tagging_system TEXT,
  prompt_visual_tagging_user TEXT,
  prompt_music_analysis_system TEXT,
  prompt_music_analysis_user TEXT,
  prompt_mike_duncan_tone TEXT,
  prompt_mark_felton_tone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Series table
CREATE TABLE IF NOT EXISTS series (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  series_id UUID REFERENCES series(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  format TEXT CHECK (format IN ('youtube', 'youtube_short', 'tiktok')) DEFAULT 'youtube',
  status TEXT CHECK (status IN ('planned', 'scripting', 'audio', 'image', 'video', 'complete')) DEFAULT 'planned',
  scheduled_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scripts table
CREATE TABLE IF NOT EXISTS scripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE UNIQUE NOT NULL,
  source_text TEXT,
  generated_script TEXT,
  duration TEXT,
  episodes INTEGER DEFAULT 1,
  tone TEXT DEFAULT 'mike_duncan',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audios table
CREATE TABLE IF NOT EXISTS audios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID REFERENCES scripts(id) ON DELETE CASCADE NOT NULL,
  tagged_text TEXT,
  voice_id TEXT,
  stability DECIMAL(3,2) DEFAULT 0.50,
  r2_url TEXT,
  timestamps JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visuals table
CREATE TABLE IF NOT EXISTS visuals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID REFERENCES scripts(id) ON DELETE CASCADE NOT NULL,
  sequence_number INTEGER NOT NULL,
  description TEXT,
  keywords TEXT[] DEFAULT '{}',
  camera_shot TEXT DEFAULT 'drifting_still',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visual variants table
CREATE TABLE IF NOT EXISTS visual_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visual_id UUID REFERENCES visuals(id) ON DELETE CASCADE NOT NULL,
  source_url TEXT,
  processed_url TEXT,
  filters TEXT[] DEFAULT '{}',
  is_selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video clips table
CREATE TABLE IF NOT EXISTS video_clips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visual_id UUID REFERENCES visuals(id) ON DELETE CASCADE NOT NULL,
  model TEXT CHECK (model IN ('veo3.1_fast', 'veo3.1', 'kling2.6', 'sora2')) DEFAULT 'veo3.1_fast',
  duration INTEGER DEFAULT 4,
  format TEXT CHECK (format IN ('portrait', 'landscape')) DEFAULT 'landscape',
  r2_url TEXT,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Music tracks table
CREATE TABLE IF NOT EXISTS music_tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  artlist_id TEXT,
  title TEXT,
  artist TEXT,
  duration INTEGER,
  mood TEXT,
  tempo TEXT,
  genre TEXT,
  preview_url TEXT,
  r2_url TEXT,
  license_info TEXT,
  is_selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audios ENABLE ROW LEVEL SECURITY;
ALTER TABLE visuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_tracks ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User settings policies
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Series policies
CREATE POLICY "Users can view own series" ON series
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own series" ON series
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own series" ON series
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own series" ON series
  FOR DELETE USING (auth.uid() = user_id);

-- Videos policies
CREATE POLICY "Users can view own videos" ON videos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM series WHERE series.id = videos.series_id AND series.user_id = auth.uid())
  );

CREATE POLICY "Users can create videos in own series" ON videos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM series WHERE series.id = videos.series_id AND series.user_id = auth.uid())
  );

CREATE POLICY "Users can update own videos" ON videos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM series WHERE series.id = videos.series_id AND series.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own videos" ON videos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM series WHERE series.id = videos.series_id AND series.user_id = auth.uid())
  );

-- Scripts policies
CREATE POLICY "Users can view own scripts" ON scripts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM videos
      JOIN series ON series.id = videos.series_id
      WHERE videos.id = scripts.video_id AND series.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own scripts" ON scripts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM videos
      JOIN series ON series.id = videos.series_id
      WHERE videos.id = scripts.video_id AND series.user_id = auth.uid()
    )
  );

-- Audios policies
CREATE POLICY "Users can manage own audios" ON audios
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM scripts
      JOIN videos ON videos.id = scripts.video_id
      JOIN series ON series.id = videos.series_id
      WHERE scripts.id = audios.script_id AND series.user_id = auth.uid()
    )
  );

-- Visuals policies
CREATE POLICY "Users can manage own visuals" ON visuals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM scripts
      JOIN videos ON videos.id = scripts.video_id
      JOIN series ON series.id = videos.series_id
      WHERE scripts.id = visuals.script_id AND series.user_id = auth.uid()
    )
  );

-- Visual variants policies
CREATE POLICY "Users can manage own visual variants" ON visual_variants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM visuals
      JOIN scripts ON scripts.id = visuals.script_id
      JOIN videos ON videos.id = scripts.video_id
      JOIN series ON series.id = videos.series_id
      WHERE visuals.id = visual_variants.visual_id AND series.user_id = auth.uid()
    )
  );

-- Video clips policies
CREATE POLICY "Users can manage own video clips" ON video_clips
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM visuals
      JOIN scripts ON scripts.id = visuals.script_id
      JOIN videos ON videos.id = scripts.video_id
      JOIN series ON series.id = videos.series_id
      WHERE visuals.id = video_clips.visual_id AND series.user_id = auth.uid()
    )
  );

-- Music tracks policies
CREATE POLICY "Users can manage own music tracks" ON music_tracks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM videos
      JOIN series ON series.id = videos.series_id
      WHERE videos.id = music_tracks.video_id AND series.user_id = auth.uid()
    )
  );

-- Triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_series_updated_at BEFORE UPDATE ON series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scripts_updated_at BEFORE UPDATE ON scripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audios_updated_at BEFORE UPDATE ON audios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visuals_updated_at BEFORE UPDATE ON visuals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visual_variants_updated_at BEFORE UPDATE ON visual_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_clips_updated_at BEFORE UPDATE ON video_clips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_music_tracks_updated_at BEFORE UPDATE ON music_tracks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_series_user_id ON series(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_series_id ON videos(series_id);
CREATE INDEX IF NOT EXISTS idx_scripts_video_id ON scripts(video_id);
CREATE INDEX IF NOT EXISTS idx_audios_script_id ON audios(script_id);
CREATE INDEX IF NOT EXISTS idx_visuals_script_id ON visuals(script_id);
CREATE INDEX IF NOT EXISTS idx_visual_variants_visual_id ON visual_variants(visual_id);
CREATE INDEX IF NOT EXISTS idx_video_clips_visual_id ON video_clips(visual_id);
CREATE INDEX IF NOT EXISTS idx_music_tracks_video_id ON music_tracks(video_id);
