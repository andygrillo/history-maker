-- Add is_ai_generated column to visual_variants table
ALTER TABLE visual_variants ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN visual_variants.is_ai_generated IS 'True if the source image was AI-generated (not from Wikimedia or upload)';
