/*
  # Add notification preferences table
  
  1. New Tables
    - notification_preferences
      - user_id (uuid, references profiles)
      - email_notifications (boolean)
      - push_notifications (boolean)
      - maintenance_alerts (boolean)
      - transaction_alerts (boolean)
      - fleet_updates (boolean)
      - security_alerts (boolean)
      - weekly_reports (boolean)
      - monthly_reports (boolean)
  
  2. Security
    - Enable RLS
    - Add policies for user access
*/

-- Create notification preferences table
CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  maintenance_alerts boolean DEFAULT true,
  transaction_alerts boolean DEFAULT true,
  fleet_updates boolean DEFAULT true,
  security_alerts boolean DEFAULT true,
  weekly_reports boolean DEFAULT true,
  monthly_reports boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies with unique names
CREATE POLICY "notification_preferences_select_20250129210143"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notification_preferences_insert_20250129210143"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_preferences_update_20250129210143"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();