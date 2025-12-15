-- Rename project_id to series_id in videos table to match schema
ALTER TABLE videos RENAME COLUMN project_id TO series_id;
